import express from 'express';
import { handleError } from './errors';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => {
  const started = Date.now();
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.on('finish', () => {
    if (req.path.startsWith('/api'))
      log(
        `${req.method} ${req.path} ${res.statusCode} ${Date.now() - started}ms`,
      );
  });
  next();
});
async function start() {
  const server = await registerRoutes(app);
  if (app.get('env') === 'development') await setupVite(app, server);
  else serveStatic(app);
  app.use(handleError);
  const port = Number(process.env.PORT ?? 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT must be between 1 and 65535');
  server.on('error', (error) => {
    console.error('Server failed:', error);
    process.exitCode = 1;
  });
  server.listen(port, process.env.HOST ?? '127.0.0.1', () =>
    log(`serving on port ${port}`),
  );
}
start().catch((error) => {
  console.error(
    'Startup failed. Run npm run data:sync if the snapshot is missing.',
    error,
  );
  process.exitCode = 1;
});
