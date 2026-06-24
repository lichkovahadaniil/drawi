#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$ROOT_DIR/.local/postgres"
LOG_FILE="$ROOT_DIR/.local/postgres.log"
DB_NAME="drawi"
DB_USER="drawi"
DB_PASSWORD="drawi_dev_password"
DB_PORT="5432"

mkdir -p "$ROOT_DIR/.local"

ensure_drawi_database() {
  psql postgres -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASSWORD';
  ELSE
    ALTER ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\\gexec
SQL
}

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo "[drawi] Docker is available; starting Postgres with docker compose."
  exec docker compose up postgres
fi

if ! command -v postgres >/dev/null 2>&1 || ! command -v initdb >/dev/null 2>&1; then
  echo "[drawi] Neither Docker nor local PostgreSQL binaries were found."
  echo "[drawi] Install Docker Desktop, or install Postgres with: brew install postgresql@16"
  exit 1
fi

if pg_isready -h localhost -p "$DB_PORT" >/dev/null 2>&1; then
  echo "[drawi] Local Postgres is already running on port $DB_PORT."
  ensure_drawi_database
  echo "[drawi] Database is ready: postgres://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME"
  exit 0
fi

if [ ! -d "$DATA_DIR" ]; then
  echo "[drawi] Initializing local Postgres data directory at $DATA_DIR."
  initdb -D "$DATA_DIR" --auth=trust >/dev/null
fi

echo "[drawi] Starting local Postgres on port $DB_PORT."
pg_ctl -D "$DATA_DIR" -l "$LOG_FILE" -o "-p $DB_PORT" start

for _ in {1..30}; do
  if pg_isready -h localhost -p "$DB_PORT" >/dev/null 2>&1; then
    ensure_drawi_database
    echo "[drawi] Database is ready: postgres://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME"
    echo "[drawi] Log file: $LOG_FILE"
    exit 0
  fi
  sleep 1
done

echo "[drawi] Postgres did not become ready in time. Check $LOG_FILE."
exit 1
