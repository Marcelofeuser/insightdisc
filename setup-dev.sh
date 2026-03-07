#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_ENV_FILE="$ROOT_DIR/server/.env"

echo "Starting InsightDISC development environment..."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker não está instalado. Instale o Docker Desktop e tente novamente."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose (plugin) não está disponível. Atualize/instale o Docker Compose."
  exit 1
fi

DB_PORT=5432
if command -v lsof >/dev/null 2>&1; then
  if lsof -iTCP:5432 -sTCP:LISTEN >/dev/null 2>&1; then
    if docker ps --format '{{.Names}}' | grep -q '^insightdisc_postgres$'; then
      DB_PORT=5432
    else
      DB_PORT=5433
      echo "Porta 5432 ocupada. Usando porta alternativa 5433 para PostgreSQL Docker."
    fi
  fi
fi

export INSIGHTDISC_POSTGRES_PORT="$DB_PORT"

echo "Atualizando DATABASE_URL para usar localhost:${DB_PORT}..."
node <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const envFile = path.join(root, 'server', '.env');
const port = process.env.INSIGHTDISC_POSTGRES_PORT || '5432';
const nextDatabaseUrl = `DATABASE_URL="postgresql://insightdisc:insightdisc@localhost:${port}/insightdisc?schema=public"`;

let content = '';
if (fs.existsSync(envFile)) {
  content = fs.readFileSync(envFile, 'utf8');
}

if (/^DATABASE_URL=.*$/m.test(content)) {
  content = content.replace(/^DATABASE_URL=.*$/m, nextDatabaseUrl);
} else {
  content = `${nextDatabaseUrl}\n${content}`;
}

fs.writeFileSync(envFile, content, 'utf8');
console.log(`DATABASE_URL set to localhost:${port}`);
NODE

echo "Starting PostgreSQL container..."
cd "$ROOT_DIR"
docker compose up -d

echo "Waiting database..."
for _ in {1..30}; do
  if docker compose exec -T postgres pg_isready -U insightdisc -d insightdisc >/dev/null 2>&1; then
    echo "Database is ready."
    break
  fi
  sleep 2
done

if ! docker compose exec -T postgres pg_isready -U insightdisc -d insightdisc >/dev/null 2>&1; then
  echo "Banco não respondeu a tempo."
  exit 1
fi

echo "Installing dependencies..."
cd "$ROOT_DIR/server"
npm install

echo "Generating Prisma client..."
npx prisma generate

echo "Running migrations..."
npx prisma migrate dev --name init

echo "Creating super admin..."
npm run seed:super-admin

echo "----------------------------------------"
echo "INSIGHTDISC DEV READY"
echo "----------------------------------------"
echo "Database: PostgreSQL (Docker)"
echo "Host: localhost"
echo "Port: ${DB_PORT}"
echo
echo "Super Admin Login:"
echo "http://localhost:5173/super-admin-login"
echo
echo "EMAIL:"
echo "admin@insightdisc.app"
echo
echo "PASSWORD:"
echo "Trocar123!"
echo
echo "MASTER KEY:"
echo "InsightDiscMaster2026!"
echo "----------------------------------------"

echo "Starting backend..."
npm run dev
