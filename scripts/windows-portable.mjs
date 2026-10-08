import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundle = path.dirname(app);
const url = "http://127.0.0.1:3000";
const modelUrl = "http://127.0.0.1:11435";
const modelName = "qwen3:1.7b";
const bundledModels = path.join(bundle, "models");
const installedModels = path.join(app, ".jeff-data", "ollama-models");
const modelDirectory = existsSync(bundledModels) ? bundledModels : installedModels;
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
  JEFF_ACCESS_CODE: "",
  APP_ORIGIN: url,
  NEXT_TELEMETRY_DISABLED: "1",
  NODE_ENV: "development",
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: app,
    env: environment,
    stdio: "inherit",
    ...options,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `${path.basename(command)} failed. ${result.error?.message || "See the message above, then try setup again."}`,
    );
}

function findOllama() {
  const options = [
    process.env.LOCALAPPDATA &&
      path.join(process.env.LOCALAPPDATA, "Programs", "Ollama", "ollama.exe"),
    "ollama.exe",
  ].filter(Boolean);
  for (const command of options) {
    const result = spawnSync(command, ["--version"], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (!result.error && result.status === 0) return command;
  }
  throw new Error(
    "Install Ollama for Windows from https://ollama.com/download/windows, then run setup again.",
  );
}

function findPython() {
  for (const [command, args] of [
    ["py", ["-3.13"]],
    ["py", ["-3"]],
    ["python", []],
  ]) {
    const result = spawnSync(
      command,
      [
        ...args,
        "-c",
        "import sys,struct; assert sys.version_info >= (3,9) and struct.calcsize('P') == 8; print(sys.executable)",
      ],
      { encoding: "utf8", windowsHide: true },
    );
    if (!result.error && result.status === 0) return result.stdout.trim();
  }
  throw new Error(
    "Install 64-bit Python 3.13 from https://www.python.org/downloads/windows/ (include the Python launcher), then run setup again.",
  );
}

async function setup() {
  const ollama = findOllama();
  const python = findPython();
  console.log(
    "Installing JEFF's Windows packages. Internet is needed for this first setup.",
  );
  run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm ci"]);
  console.log(
    "Setting up local speech recognition using the bundled speech model...",
  );
  run(python, [path.join(app, "scripts", "setup-speech.py")]);
  if (!existsSync(path.join(modelDirectory, "manifests", "registry.ollama.ai", "library", "qwen3", "1.7b"))) {
    console.log("Downloading JEFF's local AI model...");
    await mkdir(modelDirectory, { recursive: true });
    const server = spawn(ollama, ["serve"], { cwd: app, env: environment, stdio: "ignore", windowsHide: true });
    try {
      await waitFor(`${modelUrl}/api/tags`, 60000);
      run(ollama, ["pull", modelName]);
    } finally {
      if (server.pid) spawnSync("taskkill.exe", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore", windowsHide: true });
    }
  }
  await mkdir(path.join(app, ".jeff-data"), { recursive: true });
  await writeFile(
    path.join(app, ".jeff-data", "windows-setup.json"),
    JSON.stringify(
      {
        platform: process.platform,
        architecture: process.arch,
        node: process.versions.node,
        python,
        completed: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(
    "\nSetup complete. Double-click 2 - START JEFF.cmd to open JEFF.",
  );
}

async function portAvailable(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", () =>
      reject(
        new Error(
          `Port ${port} is already in use. Close the other JEFF window or the application using this port, then try again.`,
        ),
      ),
    );
    server.listen(port, "127.0.0.1", () => server.close(resolve));
  });
}

function launch(command, args) {
  const child = spawn(command, args, {
    cwd: app,
    env: environment,
    stdio: "inherit",
    windowsHide: true,
  });
  children.add(child);
  child.on("error", (error) => {
    console.error(error.message);
    shutdown(1);
  });
  child.on("exit", (code) => {
    children.delete(child);
    if (!stopping) shutdown(code || 0);
  });
  return child;
}

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.pid && child.exitCode === null)
      spawnSync("taskkill.exe", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore",
        windowsHide: true,
      });
  }
  process.exit(code);
}

async function waitFor(endpoint, milliseconds) {
  const deadline = Date.now() + milliseconds;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(2500),
      });
      if (response.ok) return await response.json();
    } catch {
      /* The local service is still starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `JEFF could not start ${endpoint}. Check the messages above.`,
  );
}

async function start() {
  if (
    !existsSync(path.join(app, ".jeff-data", "windows-setup.json")) ||
    !existsSync(path.join(app, "node_modules", "next", "dist", "bin", "next"))
  )
    throw new Error("Run 1 - SETUP JEFF.cmd first.");
  const ollama = findOllama();
  await portAvailable(3000);
  await portAvailable(11435);
  process.on("SIGINT", () => shutdown());
  process.on("SIGTERM", () => shutdown());
  process.on("SIGBREAK", () => shutdown());
  console.log(
    "Starting JEFF's local AI. Keep this window open; press Ctrl+C here to stop JEFF.",
  );
  launch(ollama, ["serve"]);
  const data = await waitFor(`${modelUrl}/api/tags`, 60000);
  if (!data.models?.some((model) => (model.name || model.model) === modelName))
    throw new Error(
      "JEFF's AI model was not found. Check that the complete models folder was copied.",
    );
  launch(process.execPath, [
    path.join(app, "node_modules", "next", "dist", "bin", "next"),
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3000",
  ]);
  const status = await waitFor(`${url}/api/status`, 90000);
  if (!status.configured || !status.localSpeechAvailable)
    throw new Error(
      "A local AI or speech dependency is missing. Run setup again and check its output.",
    );
  console.log(
    `\nJEFF is ready: ${url}\nPress Ctrl+C in this window to stop both JEFF and its local AI service.\n`,
  );
  const browser = spawn("rundll32.exe", ["url.dll,FileProtocolHandler", url], {
    detached: true,
    stdio: "ignore",
  });
  browser.on("error", () => console.log(`Open ${url} in Chrome or Edge.`));
  browser.unref();
}

try {
  if (process.platform !== "win32" || process.arch !== "x64")
    throw new Error(
      "This launcher is for 64-bit Intel/AMD Windows. Use the normal npm commands on a Mac.",
    );
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 6))
    throw new Error(
      "Install the current Node.js LTS Windows x64 version from https://nodejs.org/en/download.",
    );
  if (process.argv[2] === "setup") await setup();
  else if (process.argv[2] === "start") await start();
  else
    throw new Error(
      "Use the numbered SETUP and START buttons in the transfer folder.",
    );
} catch (error) {
  console.error(
    `\n${error.message}\nSee START HERE.html in the transfer folder.`,
  );
  shutdown(1);
}
