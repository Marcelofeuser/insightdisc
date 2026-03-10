import app from './app.js';
import { env } from './config/env.js';
import { printSuperAdminBootstrapStatus } from './modules/auth/super-admin-bootstrap.js';

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`InsightDISC API running on http://localhost:${env.port}`);
  void printSuperAdminBootstrapStatus();
});

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    // eslint-disable-next-line no-console
    console.error(
      `[server] porta ${env.port} já está em uso. Encerre a instância anterior antes de reiniciar o backend.`,
    );
    process.exitCode = 1;
    return;
  }

  throw error;
});

function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`[server] recebendo ${signal}, encerrando servidor HTTP...`);

  server.close((error) => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[server] erro ao encerrar servidor:', error);
      process.exit(1);
      return;
    }

    process.exit(0);
  });

  setTimeout(() => {
    // eslint-disable-next-line no-console
    console.warn('[server] encerramento forçado após timeout.');
    process.exit(1);
  }, 5_000).unref();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
