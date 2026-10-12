import { preview, type PreviewServer } from 'vite';
import { createServer, request, type ServerResponse } from 'node:http';
import path from 'node:path';

export type CatalogueMode = 'standard' | 'compact';
export interface NetworkProfile {
  latencyMs: number;
  downloadBitsPerSecond: number;
}
export interface ProxyRequest {
  mode: CatalogueMode;
  path: string;
  status: number;
  bodyBytes: number;
  shaped: boolean;
}

// A single browser origin permits genuine worker updates between build modes.
// Shared response pacing covers page and worker traffic, unlike page-only CDP.
export async function transportPreview(builds: Record<CatalogueMode, string>) {
  const servers: PreviewServer[] = [];
  const origins: Partial<Record<CatalogueMode, string>> = {};
  const requests: ProxyRequest[] = [];
  let mode: CatalogueMode = 'standard';
  let profile: NetworkProfile | null = null;
  let failure: RegExp | null = null;
  const timers = new Set<NodeJS.Timeout>();
  const jobs: {
    response: ServerResponse;
    body: Buffer;
    offset: number;
    rate: number;
  }[] = [];
  let pumping = false;
  function later(callback: () => void, ms: number) {
    const timer = setTimeout(() => {
      timers.delete(timer);
      callback();
    }, ms);
    timers.add(timer);
  }
  function pump() {
    if (pumping) return;
    const job = jobs.shift();
    if (!job) return;
    if (job.response.destroyed) {
      pump();
      return;
    }
    pumping = true;
    const chunk = job.body.subarray(job.offset, job.offset + 16 * 1024);
    later(
      () => {
        if (!job.response.destroyed) {
          job.response.write(chunk);
          job.offset += chunk.length;
          if (job.offset === job.body.length) job.response.end();
          else jobs.push(job);
        }
        pumping = false;
        pump();
      },
      (chunk.length / (job.rate / 8)) * 1000,
    );
  }
  try {
    for (const current of ['standard', 'compact'] as const) {
      const server = await preview({
        configFile: false,
        root: path.resolve('client'),
        base: '/PokemonPedia/',
        build: { outDir: builds[current] },
        preview: { host: '127.0.0.1', port: 0 },
      });
      servers.push(server);
      const address = server.httpServer.address();
      if (!address || typeof address === 'string')
        throw new Error('No transport preview port');
      origins[current] = `http://127.0.0.1:${address.port}`;
    }
  } catch (error) {
    await Promise.all(servers.map((server) => server.close()));
    throw error;
  }
  const proxy = createServer((incoming, outgoing) => {
    const current = mode,
      network = profile;
    const entry: ProxyRequest = {
      mode: current,
      path: incoming.url ?? '/',
      status: 0,
      bodyBytes: 0,
      shaped: Boolean(network),
    };
    requests.push(entry);
    if (failure?.test(entry.path)) {
      entry.status = 503;
      outgoing.writeHead(503, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      outgoing.end('{}');
      return;
    }
    const target = new URL(entry.path, origins[current]);
    const upstream = request(
      target,
      {
        method: incoming.method,
        headers: { ...incoming.headers, host: target.host },
      },
      (response) => {
        entry.status = response.statusCode ?? 502;
        outgoing.writeHead(entry.status, response.headers);
        if (!network) {
          response.on('data', (chunk: Buffer) => {
            entry.bodyBytes += chunk.length;
          });
          response.pipe(outgoing);
          return;
        }
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          const body = Buffer.concat(chunks);
          entry.bodyBytes = body.length;
          later(() => {
            if (!body.length) {
              outgoing.end();
              return;
            }
            jobs.push({
              response: outgoing,
              body,
              offset: 0,
              rate: network.downloadBitsPerSecond,
            });
            pump();
          }, network.latencyMs);
        });
      },
    );
    upstream.on('error', () => {
      if (!outgoing.headersSent) outgoing.writeHead(502);
      outgoing.end();
    });
    outgoing.on('close', () => upstream.destroy());
    incoming.pipe(upstream);
  });
  await new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve));
  const address = proxy.address();
  if (!address || typeof address === 'string') throw new Error('No proxy port');
  return {
    url: `http://127.0.0.1:${address.port}/PokemonPedia/`,
    requests,
    select: (value: CatalogueMode) => {
      mode = value;
    },
    shape: (value: NetworkProfile | null) => {
      profile = value;
    },
    fail: (value: RegExp | null) => {
      failure = value;
    },
    reset: () => {
      requests.length = 0;
    },
    close: async () => {
      for (const timer of timers) clearTimeout(timer);
      for (const job of jobs) job.response.destroy();
      proxy.closeAllConnections();
      await new Promise<void>((resolve) => proxy.close(() => resolve()));
      await Promise.all(servers.map((server) => server.close()));
    },
  };
}
