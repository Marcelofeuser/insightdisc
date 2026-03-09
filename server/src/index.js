import app from './app.js';
import { env } from './config/env.js';
import { printSuperAdminBootstrapStatus } from './modules/auth/super-admin-bootstrap.js';

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`InsightDISC API running on http://localhost:${env.port}`);
  void printSuperAdminBootstrapStatus();
});
