import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = "http://127.0.0.1:3000";
const modelUrl = "http://127.0.0.1:11435";
const modelName = "qwen3:1.7b";
const modelDirectory = path.join(app, ".jeff-data", "ollama-models");
const marker = path.join(app, ".jeff-data", "unix-setup.json");
const children = new Set();
let stopping = false;
const environment = {
  ...process.env,
  OLLAMA_HOST: "127.0.0.1:11435",
  OLLAMA_MODELS: modelDirectory,
  OLLAMA_NO_CLOUD: "1",
  OLLAMA_BASE_URL: modelUrl,
  OLLAMA_MODEL: modelName,
  JEFF_ENABLE_OPENAI: "false",
  OPENAI_API_KEY: "",
  APP_ORIGIN: url,
  NEXT_TELEMETRY_DISABLED: "1",
  NODE_ENV: "development",
};

function run(command, args) {
  const result = spawnSync(command, args, { cwd: app, env: environment, stdio: "inherit" });
  if (result.error || result.status !== 0) throw new Error(`${command} failed. Check the message above.`);
}

async function waitFor(endpoint, milliseconds) {
  const deadline = Date.now() + milliseconds;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(2500) });
      if (response.ok) return await response.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`JEFF could not start ${endpoint}.`);
}

function launch(command, args, stdio = "inherit") {
  const child = spawn(command, args, { cwd: app, env: environment, stdio });
  children.add(child);
  child.on("exit", (code) => { children.delete(child); if (!stopping) shutdown(code || 0); });
  return child;
}

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.pid && child.exitCode === null) child.kill("SIGTERM");
  process.exit(code);
}

async function ensurePort(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", () => reject(new Error(`Port ${port} is already in use.`)));
    server.listen(port, "127.0.0.1", () => server.close(resolve));
  });
}

async function setup() {
  run("npm", ["ci"]);
  run("python3", [path.join(app, "scripts", "setup-speech.py")]);
  await mkdir(modelDirectory, { recursive: true });
  const server = launch("ollama", ["serve"], "ignore");
  try {
    await waitFor(`${modelUrl}/api/tags`, 60000);
    run("ollama", ["pull", modelName]);
  } finally {
    server.kill("SIGTERM");
    children.delete(server);
  }
  await mkdir(path.dirname(marker), { recursive: true });
  await writeFile(marker, JSON.stringify({ platform: process.platform, architecture: process.arch, completed: new Date().toISOString() }, null, 2));
  console.log("JEFF setup is complete.");
}

async function start() {
  if (!existsSync(marker)) throw new Error("Run JEFF setup first.");
  await ensurePort(3000);
  await ensurePort(11435);
  process.on("SIGINT", () => shutdown());
  process.on("SIGTERM", () => shutdown());
  launch("ollama", ["serve"]);
  await waitFor(`${modelUrl}/api/tags`, 60000);
  launch(process.execPath, [path.join(app, "node_modules", "next", "dist", "bin", "next"), "dev", "--hostname", "127.0.0.1", "--port", "3000"]);
  await waitFor(`${url}/api/status`, 90000);
  const opener = process.platform === "darwin" ? "open" : "xdg-open";
  spawn(opener, [url], { detached: true, stdio: "ignore" }).unref();
  console.log(`JEFF is ready at ${url}. Keep this window open.`);
}

try {
  if (!['linux', 'darwin'].includes(process.platform)) throw new Error('This launcher is for Linux and macOS.');
  if (process.argv[2] === "setup") await setup();
  else if (process.argv[2] === "start") await start();
  else throw new Error("Use setup or start.");
} catch (error) {
  console.error(`\n${error.message}`);
  shutdown(1);
}
