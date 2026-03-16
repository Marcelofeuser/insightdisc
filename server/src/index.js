import { createApp } from './app.js';
import { env } from './config/env.js';
import { printSuperAdminBootstrapStatus } from './modules/auth/super-admin-bootstrap.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`InsightDISC API running on http://localhost:${env.port}`);
  console.log('[server] CORS allowed origins:', env.corsAllowedOrigins.join(', '));
  void printSuperAdminBootstrapStatus();
});

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.error(
      `[server] porta ${env.port} já está em uso. Encerre a instância anterior antes de reiniciar o backend.`,
    );
    process.exitCode = 1;
    return;
  }

  throw error;
});

function shutdown(signal) {
  console.log(`[server] recebendo ${signal}, encerrando servidor HTTP...`);

  server.close((error) => {
    if (error) {
      console.error('[server] erro ao encerrar servidor:', error);
      process.exit(1);
      return;
    }

    process.exit(0);
  });

  setTimeout(() => {
    console.warn('[server] encerramento forçado após timeout.');
    process.exit(1);
  }, 5_000).unref();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
