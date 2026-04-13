import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPrismaConnectionSummary,
  resolvePrismaConnectionConfig,
} from '../../server/src/lib/prisma-connection.js';

test('resolvePrismaConnectionConfig aplica defaults de pool em produção', () => {
  const config = resolvePrismaConnectionConfig({
    nodeEnv: 'production',
    databaseUrl: 'postgresql://user:pass@proxy.rlwy.net:12345/railway?sslmode=require',
    directUrl: 'postgresql://user:pass@containers-us-west-1.railway.app:5432/railway?sslmode=require',
  });

  assert.equal(config.usesRailway, true);
  assert.equal(config.usesPoolProxy, true);
  assert.equal(config.connectionLimit, '5');
  assert.equal(config.poolTimeout, '20');
  assert.equal(config.directUrlConfigured, true);
  assert.equal(config.warnings.length, 0);
  assert.match(config.runtimeUrl, /connection_limit=5/);
  assert.match(config.runtimeUrl, /pool_timeout=20/);
});

test('resolvePrismaConnectionConfig preserva parâmetros explícitos já configurados', () => {
  const config = resolvePrismaConnectionConfig({
    nodeEnv: 'production',
    databaseUrl: 'postgresql://user:pass@proxy.rlwy.net:12345/railway?sslmode=require&connection_limit=9&pool_timeout=45',
    directUrl: 'postgresql://user:pass@containers-us-west-1.railway.app:5432/railway?sslmode=require',
  });

  assert.equal(config.connectionLimit, '9');
  assert.equal(config.poolTimeout, '45');
  assert.match(config.runtimeUrl, /connection_limit=9/);
  assert.match(config.runtimeUrl, /pool_timeout=45/);
});

test('resolvePrismaConnectionConfig avisa quando Railway está sem URL pooled e sem DIRECT_URL', () => {
  const config = resolvePrismaConnectionConfig({
    nodeEnv: 'production',
    databaseUrl: 'postgresql://user:pass@containers-us-west-1.railway.app:5432/railway?sslmode=require',
    directUrl: '',
  });

  assert.equal(config.usesRailway, true);
  assert.equal(config.usesPoolProxy, false);
  assert.equal(config.directUrlConfigured, false);
  assert.equal(config.warnings.length, 2);
});

test('formatPrismaConnectionSummary não expõe credenciais', () => {
  const summary = formatPrismaConnectionSummary({
    runtimeHost: 'proxy.rlwy.net',
    runtimeDatabase: 'railway',
    usesRailway: true,
    usesPoolProxy: true,
    connectionLimit: '5',
    poolTimeout: '20',
    directUrlConfigured: true,
    sslMode: 'require',
  });

  assert.match(summary, /host=proxy\.rlwy\.net/);
  assert.doesNotMatch(summary, /user|pass|postgresql:\/\//);
});
