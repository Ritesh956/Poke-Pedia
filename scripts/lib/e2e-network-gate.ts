import { existsSync } from 'node:fs';
import type { Plugin } from 'vite';

export function e2eNetworkGate(marker: string): Plugin {
  return {
    name: 'pokemonpedia-e2e-origin-outage',
    configurePreviewServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (existsSync(marker)) request.socket.destroy();
        else next();
      });
    },
  };
}
