#!/usr/bin/env node

import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(rootDir, "apps/web");
const workerDir = path.join(rootDir, "apps/sync-worker");
const runId = process.env.DRAWI_SMOKE_RUN_ID ?? String(Date.now());
const dbName = `drawi_smoke_${runId.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase()}`;
const webPort = Number(process.env.DRAWI_SMOKE_WEB_PORT ?? "3000");
const syncPort = Number(process.env.DRAWI_SMOKE_SYNC_PORT ?? "8787");
const livekitPort = Number(process.env.DRAWI_SMOKE_LIVEKIT_PORT ?? "7880");
const pgPort = Number(process.env.DRAWI_SMOKE_PG_PORT ?? "5432");
const dbUser = process.env.DRAWI_SMOKE_PG_USER ?? "drawi";
const dbPassword = process.env.DRAWI_SMOKE_PG_PASSWORD ?? "drawi_dev_password";
const adminDbUsers = uniqueValues([
  process.env.DRAWI_SMOKE_PG_ADMIN_USER,
  "postgres",
  process.env.USER,
]).filter((user) => user && user !== dbUser);
const logsDir = path.join(rootDir, ".local", "runtime-smoke", runId);
const persistDir = path.join(logsDir, "wrangler-state");
const devVarsPath = path.join(workerDir, ".dev.vars");
const syncSecret =
  process.env.SYNC_COOKIE_SECRET ?? readSyncSecret() ?? "drawi-local-runtime-smoke-secret";
const databaseUrl = `postgres://${dbUser}:${dbPassword}@localhost:${pgPort}/${dbName}`;
const children = [];
let createdDevVars = false;

fs.mkdirSync(logsDir, { recursive: true });

process.on("SIGINT", () => {
  cleanup({ keepArtifacts: true }).finally(() => process.exit(130));
});
process.on("SIGTERM", () => {
  cleanup({ keepArtifacts: true }).finally(() => process.exit(143));
});

try {
  validateDatabaseName(dbName);
  await assertPortFree(webPort, "web app");
  await assertPortFree(syncPort, "sync worker");
  await assertPortFree(livekitPort, "LiveKit");

  console.log(`[local-smoke] run id: ${runId}`);
  console.log(`[local-smoke] logs: ${logsDir}`);

  await ensurePostgres();
  createDatabase();
  ensureDevVars();
  runCommand(webBin("drizzle-kit"), ["migrate"], { cwd: webDir, env: smokeEnv() });

  const livekit = startProcess("livekit", "livekit-server", ["--dev", "--bind", "127.0.0.1"], {
    env: smokeEnv(),
  });
  await waitForPort(livekitPort, "LiveKit", livekit);

  const syncWorker = startProcess(
    "sync-worker",
    workerBin("wrangler"),
    [
      "dev",
      "--local",
      "--ip",
      "127.0.0.1",
      "--port",
      String(syncPort),
      "--persist-to",
      persistDir,
      "--log-level",
      "warn",
    ],
    {
      cwd: workerDir,
      env: {
        ...smokeEnv(),
        XDG_CONFIG_HOME: path.join(os.tmpdir(), "drawi-xdg-config"),
        WRANGLER_CACHE_DIR: path.join(os.tmpdir(), "drawi-wrangler-cache"),
        WRANGLER_SEND_METRICS: "false",
        WRANGLER_SEND_ERROR_REPORTS: "false",
      },
    },
  );
  await waitForPort(syncPort, "sync worker", syncWorker);

  const web = startProcess(
    "web",
    webBin("next"),
    ["dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(webPort)],
    { cwd: webDir, env: smokeEnv() },
  );
  await waitForPort(webPort, "web app", web);

  runCommand(process.execPath, [path.join(rootDir, "scripts/runtime-smoke.mjs")], {
    env: {
      ...smokeEnv(),
      PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${webPort}`,
      DRAWI_SMOKE_RUN_ID: runId,
    },
  });

  console.log("[local-smoke] passed");
} catch (error) {
  console.error(`[local-smoke] failed: ${error instanceof Error ? error.message : String(error)}`);
  printProcessHints();
  process.exitCode = 1;
} finally {
  await cleanup();
}

function smokeEnv() {
  return {
    ...process.env,
    APP_URL: `http://127.0.0.1:${webPort}`,
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "drawi-local-runtime-smoke-auth-secret",
    BETTER_AUTH_URL: `http://127.0.0.1:${webPort}`,
    NEXT_PUBLIC_LIVEKIT_URL: `ws://127.0.0.1:${livekitPort}`,
    LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY ?? "devkey",
    LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET ?? "secret",
    NEXT_PUBLIC_DRAWI_SYNC_URL: `http://127.0.0.1:${syncPort}`,
    SYNC_COOKIE_SECRET: syncSecret,
    SYNC_WORKER_ORIGIN: `http://127.0.0.1:${syncPort}`,
  };
}

function readSyncSecret() {
  if (!fs.existsSync(devVarsPath)) return null;
  const content = fs.readFileSync(devVarsPath, "utf8");
  const match = content.match(/^SYNC_COOKIE_SECRET=(.+)$/m);
  return match?.[1]?.trim() || null;
}

function ensureDevVars() {
  if (fs.existsSync(devVarsPath)) return;
  fs.writeFileSync(devVarsPath, `SYNC_COOKIE_SECRET=${syncSecret}\n`);
  createdDevVars = true;
}

async function ensurePostgres() {
  if (await canConnectToPostgres()) return;

  if (hasCommand("docker") && dockerIsRunning()) {
    runCommand("docker", ["compose", "up", "-d", "postgres"]);
    await waitForPostgres();
    return;
  }

  runCommand("sh", [path.join(rootDir, "scripts/dev-db.sh")]);
  await waitForPostgres();
}

async function canConnectToPostgres() {
  try {
    await runPsql("SELECT 1;", "postgres", { silent: true });
    return true;
  } catch {
    return false;
  }
}

async function waitForPostgres() {
  await waitFor(
    async () => canConnectToPostgres(),
    "Postgres did not become ready in time",
    60_000,
  );
}

function createDatabase() {
  runPsqlWithAdminFallback(`DROP DATABASE IF EXISTS ${quoteIdentifier(dbName)} WITH (FORCE);`);
  runPsqlWithAdminFallback(
    `CREATE DATABASE ${quoteIdentifier(dbName)} OWNER ${quoteIdentifier(dbUser)};`,
  );
}

async function dropDatabase() {
  try {
    runPsqlWithAdminFallback(`DROP DATABASE IF EXISTS ${quoteIdentifier(dbName)} WITH (FORCE);`);
  } catch (error) {
    console.warn(
      `[local-smoke] could not drop ${dbName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function runPsqlSync(sql, database, options = {}) {
  const result = runPsqlCommand(sql, database, options);
  if (result.status !== 0) {
    throw new Error(`psql failed for ${database}: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function runPsqlWithAdminFallback(sql) {
  try {
    return runPsqlSync(sql, "postgres");
  } catch (dbUserError) {
    for (const adminUser of adminDbUsers) {
      try {
        return runPsqlSync(sql, "postgres", { user: adminUser, password: "" });
      } catch (error) {
        ignoreCleanupError(error);
      }
    }
    throw dbUserError;
  }
}

async function runPsql(sql, database, options = {}) {
  const result = runPsqlCommand(sql, database, options);
  if (result.status !== 0) {
    throw new Error(`psql failed for ${database}: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function runPsqlCommand(sql, database, options = {}) {
  const user = options.user ?? dbUser;
  const password = options.password ?? dbPassword;

  if (hasCommand("psql")) {
    return spawnSync(
      "psql",
      [
        "-h",
        "localhost",
        "-p",
        String(pgPort),
        "-U",
        user,
        "-d",
        database,
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        sql,
      ],
      {
        cwd: rootDir,
        env: password ? { ...process.env, PGPASSWORD: password } : { ...process.env },
        encoding: "utf8",
        stdio: options.silent ? "pipe" : ["ignore", "pipe", "pipe"],
      },
    );
  }

  return spawnSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      user,
      "-d",
      database,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ],
    {
      cwd: rootDir,
      encoding: "utf8",
      stdio: options.silent ? "pipe" : ["ignore", "pipe", "pipe"],
    },
  );
}

function startProcess(name, command, args, options = {}) {
  const logPath = path.join(logsDir, `${name}.log`);
  const log = fs.createWriteStream(logPath, { flags: "a" });
  const child = spawn(command, args, {
    cwd: options.cwd ?? rootDir,
    env: options.env ?? smokeEnv(),
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });

  child.stdout.pipe(log);
  child.stderr.pipe(log);
  child.once("exit", (code, signal) => {
    log.end(`[local-smoke] ${name} exited code=${code ?? "null"} signal=${signal ?? "null"}\n`);
  });

  children.push({ name, child, logPath });
  return { name, child, logPath };
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? rootDir,
    env: options.env ?? process.env,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result.stdout;
}

function webBin(name) {
  return path.join(webDir, "node_modules", ".bin", name);
}

function workerBin(name) {
  return path.join(workerDir, "node_modules", ".bin", name);
}

async function assertPortFree(port, label) {
  const isOpen = await canOpenTcp(port);
  if (isOpen) {
    throw new Error(`${label} port ${port} is already in use`);
  }
}

async function waitForPort(port, label, service) {
  await waitFor(async () => canOpenTcp(port), `${label} did not open port ${port} in time`, 90_000);
  await failIfExited(service);
}

async function canOpenTcp(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(750, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function failIfExited(service) {
  if (service.child.exitCode === null && !service.child.killed) return;
  const tail = fs.existsSync(service.logPath) ? tailFile(service.logPath) : "";
  throw new Error(`${service.name} exited early. Log: ${service.logPath}\n${tail}`);
}

async function waitFor(predicate, message, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await delay(500);
  }
  throw new Error(message);
}

function hasCommand(command) {
  return spawnSync(command, ["--version"], { encoding: "utf8", stdio: "ignore" }).status === 0;
}

function dockerIsRunning() {
  return spawnSync("docker", ["info"], { encoding: "utf8", stdio: "ignore" }).status === 0;
}

function validateDatabaseName(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Unsafe database name: ${name}`);
  }
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function tailFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return content.split("\n").slice(-40).join("\n");
}

function printProcessHints() {
  for (const service of children) {
    if (!fs.existsSync(service.logPath)) continue;
    console.error(`[local-smoke] ${service.name} log: ${service.logPath}`);
    console.error(tailFile(service.logPath));
  }
}

async function cleanup(options = {}) {
  for (const service of children.reverse()) {
    try {
      if (service.child.pid) process.kill(-service.child.pid, "SIGTERM");
    } catch (error) {
      ignoreCleanupError(error);
    }
  }

  await delay(1500);

  for (const service of children) {
    try {
      if (service.child.pid) process.kill(-service.child.pid, "SIGKILL");
    } catch (error) {
      ignoreCleanupError(error);
    }
  }

  await dropDatabase();

  if (createdDevVars) {
    try {
      fs.rmSync(devVarsPath, { force: true });
    } catch (error) {
      ignoreCleanupError(error);
    }
  }

  if (!options.keepArtifacts && process.env.DRAWI_SMOKE_KEEP_ARTIFACTS !== "1") {
    try {
      fs.rmSync(persistDir, { recursive: true, force: true });
    } catch (error) {
      ignoreCleanupError(error);
    }
  }
}

function ignoreCleanupError(error) {
  if (process.env.DRAWI_SMOKE_DEBUG_CLEANUP === "1") {
    console.warn(
      `[local-smoke] cleanup warning: ${error instanceof Error ? error.message : error}`,
    );
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
