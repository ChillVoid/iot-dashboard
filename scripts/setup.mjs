// One-shot setup for a fresh clone of Stack Moko Baby (Windows). Read SETUP.md first.
//
//   npm run setup                          operator laptop: server, dashboard, tunnel
//   npm run setup -- --role developer      + project map (Graphify) and test browser check
//   npm run setup -- --role bridge         Arduino CLI + ESP32 core, compiles the button bridge
//   npm run setup -- --role operator,bridge   roles can be combined; "all" = every role
//   npm run setup -- --check               read-only report: installs and changes nothing
//   npm run setup -- --yes                 also install missing programs with winget
//
// Every step is safe to re-run: finished steps are skipped, data and passwords are kept.
// Secrets (backend/.env, backend/.admin-credentials.txt) are created locally, never printed.
// The laptop that only shows the game screen needs no clone: see SETUP.md, role "screen".
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const check = args.includes("--check");
const yes = args.includes("--yes");
const roleIndex = args.indexOf("--role");
const roleArg = (
  args.find((a) => a.startsWith("--role="))?.split("=")[1] ??
  (roleIndex >= 0 ? args[roleIndex + 1] : undefined) ??
  "operator"
)
  .toLowerCase()
  .split(",");
const roles = new Set(roleArg.includes("all") ? ["operator", "developer", "bridge"] : roleArg);
for (const role of roles) {
  if (!["operator", "developer", "bridge"].includes(role)) {
    console.error(`Unknown role "${role}". Use operator, developer, bridge or all (see SETUP.md).`);
    process.exit(2);
  }
}
if (roles.has("developer")) roles.add("operator"); // developers run the full stack too

const win = process.platform === "win32";
const xampp = process.env.STACK_XAMPP_DIR || "C:\\xampp";
const venvPython = join(root, "backend", ".venv", win ? "Scripts/python.exe" : "bin/python");
const graphifyExe = join(root, ".tools", "graphify-py313", win ? "Scripts/graphify.exe" : "bin/graphify");
const ESP32_INDEX = "https://espressif.github.io/arduino-esp32/package_esp32_index.json";
// The ESP32 board core every event laptop uses (25 Nov 2026). Older cores are replaced.
const ESP32_CORE = "3.3.12";
const WINGET = {
  node: "OpenJS.NodeJS.LTS",
  python: "Python.Python.3.13",
  xampp: "ApacheFriends.Xampp.8.2",
  arduino: "ArduinoSA.CLI",
  edge: "Microsoft.Edge",
};

const results = [];
function report(status, name, detail) {
  results.push({ status, name, detail });
  const mark = { ok: "[ok]", fix: "[!!]", skip: "[--]" }[status];
  console.log(`${mark} ${name}${detail ? ` - ${detail}` : ""}`);
}

function run(command, commandArgs, options = {}) {
  // npm, winget and arduino-cli are .cmd shims on Windows and need a shell; our arguments are
  // fixed strings, so pass one command line rather than an argument list to the shell.
  const shell = options.shell ?? false;
  return spawnSync(shell ? [command, ...commandArgs].join(" ") : command, shell ? [] : commandArgs, {
    cwd: options.cwd ?? root,
    encoding: "utf-8",
    windowsHide: true,
    shell,
    stdio: options.show ? "inherit" : "pipe",
    env: { ...process.env, ...(options.env || {}) },
  });
}
const ok = (result) => result.status === 0 && !result.error;
const sha = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

function winget(id, label) {
  if (!win) return `install ${label} with your package manager`;
  const command = `winget install --id ${id} --exact --accept-package-agreements --accept-source-agreements`;
  if (yes && !check) {
    console.log(`[setup] Installing ${label} with winget…`);
    if (ok(run("winget", command.split(" ").slice(1), { show: true })))
      return `${label} installed; open a NEW terminal so PATH updates, then run npm run setup again`;
  }
  return `run: ${command}  (or npm run setup -- --yes), then reopen the terminal`;
}

function portOpen(port) {
  return new Promise((done) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    const finish = (value) => {
      socket.destroy();
      done(value);
    };
    socket.setTimeout(1200, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

// ---------------------------------------------------------------- prerequisites
function checkNode() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major > 22 || (major === 22 && minor >= 12)) report("ok", "Node.js", process.versions.node);
  else report("fix", "Node.js", `${process.versions.node} is too old (need 22.12+); ${winget(WINGET.node, "Node.js LTS")}`);
}

let python = null; // [command, ...prefixArgs] for Python 3.13
function findPython() {
  const candidates = [
    process.env.STACK_PYTHON && [process.env.STACK_PYTHON],
    win && ["py", "-3.13"],
    ["python"],
    ["python3"],
  ].filter(Boolean);
  for (const [command, ...prefix] of candidates) {
    const result = run(command, [...prefix, "--version"]);
    if (ok(result) && /Python 3\.13\./.test(result.stdout + result.stderr)) {
      python = [command, ...prefix];
      report("ok", "Python 3.13", (result.stdout + result.stderr).trim());
      return true;
    }
  }
  report("fix", "Python 3.13", `not found; ${winget(WINGET.python, "Python 3.13")}`);
  return false;
}

async function ensureMysql() {
  if (await portOpen(3306)) {
    report("ok", "MySQL (XAMPP)", "running on port 3306");
    return true;
  }
  const mysqld = join(xampp, "mysql", "bin", win ? "mysqld.exe" : "mysqld");
  if (!existsSync(mysqld)) {
    report("fix", "MySQL (XAMPP)", `XAMPP not found at ${xampp} (set STACK_XAMPP_DIR if it is elsewhere); ${winget(WINGET.xampp, "XAMPP")}`);
    return false;
  }
  if (check) {
    report("fix", "MySQL (XAMPP)", "installed but stopped: start MySQL in the XAMPP Control Panel");
    return false;
  }
  // Same detached start as scripts/online.mjs, so MySQL keeps running after setup ends.
  console.log("[setup] Starting XAMPP MySQL…");
  const server = spawn(mysqld, [`--defaults-file=${join(xampp, "mysql", "bin", "my.ini")}`, "--standalone"], {
    cwd: join(xampp, "mysql"),
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  server.on("error", () => {});
  server.unref();
  for (let i = 0; i < 60; i++) {
    if (await portOpen(3306)) {
      report("ok", "MySQL (XAMPP)", "started");
      return true;
    }
    await delay(500);
  }
  report("fix", "MySQL (XAMPP)", "did not start: open the XAMPP Control Panel and start MySQL");
  return false;
}

// ---------------------------------------------------------------- project steps
function frontendDeps() {
  const lock = join(root, "frontend", "package-lock.json");
  const stamp = join(root, "frontend", "node_modules", ".stack-setup.sha256");
  let current = existsSync(stamp) && readFileSync(stamp, "utf-8") === sha(lock);
  // Installed by hand before this script existed: trust npm's own view of the lockfile.
  if (!current && existsSync(join(root, "frontend", "node_modules")) &&
      ok(run("npm", ["--prefix", "frontend", "ls", "--depth=0"], { shell: true }))) {
    current = true;
    if (!check) writeFileSync(stamp, sha(lock));
  }
  if (current) return report("ok", "Frontend packages", "installed (frontend/node_modules)");
  if (check) return report("fix", "Frontend packages", "missing or outdated: run npm run setup");
  console.log("[setup] Installing frontend packages (npm ci)…");
  if (!ok(run("npm", ["--prefix", "frontend", "ci", "--no-audit", "--no-fund"], { show: true, shell: true })))
    return report("fix", "Frontend packages", "npm ci failed (see the output above)");
  writeFileSync(stamp, sha(lock));
  report("ok", "Frontend packages", "installed");
}

function backendVenv() {
  const requirements = join(root, "backend", "requirements.txt");
  const stamp = join(root, "backend", ".venv", ".stack-setup.sha256");
  let current = existsSync(venvPython) && existsSync(stamp) && readFileSync(stamp, "utf-8") === sha(requirements);
  if (!current && existsSync(venvPython)) {
    // Ask pip whether anything in requirements.txt is missing or a different version.
    const dry = run(venvPython, ["-m", "pip", "install", "--disable-pip-version-check", "--dry-run", "--no-deps", "-r", requirements]);
    if (ok(dry) && !/Would install/.test(dry.stdout)) {
      current = true;
      if (!check) writeFileSync(stamp, sha(requirements));
    }
  }
  if (current) return report("ok", "Backend environment", "backend/.venv up to date");
  if (check) return report("fix", "Backend environment", "missing or outdated: run npm run setup");
  if (!python) return report("fix", "Backend environment", "needs Python 3.13 first");
  if (!existsSync(venvPython)) {
    console.log("[setup] Creating backend/.venv…");
    if (!ok(run(python[0], [...python.slice(1), "-m", "venv", join(root, "backend", ".venv")], { show: true })))
      return report("fix", "Backend environment", "could not create the virtual environment");
  }
  console.log("[setup] Installing backend packages…");
  if (!ok(run(venvPython, ["-m", "pip", "install", "--disable-pip-version-check", "-q", "-r", requirements], { show: true })))
    return report("fix", "Backend environment", "pip install failed (see the output above)");
  writeFileSync(stamp, sha(requirements));
  report("ok", "Backend environment", "backend/.venv ready");
}

function database(mysqlUp) {
  const env = join(root, "backend", ".env");
  if (check) {
    if (existsSync(env)) report("ok", "Database and secrets", "backend/.env exists (run npm run setup to apply new migrations)");
    else report("fix", "Database and secrets", "not configured yet: run npm run setup");
    return;
  }
  if (!mysqlUp || !existsSync(venvPython)) return report("skip", "Database and secrets", "waiting for MySQL and the backend environment");
  console.log("[setup] Creating or updating the database (backend/setup_local.py)…");
  const result = run(venvPython, ["setup_local.py"], { cwd: join(root, "backend") });
  const output = (result.stdout || "") + (result.stderr || "");
  if (ok(result)) {
    report("ok", "Database and secrets", "migrations applied; admin password in backend/.admin-credentials.txt (private, not printed)");
  } else if (/Access denied/i.test(output)) {
    report("fix", "Database and secrets", "MySQL root has a password: set $env:STACK_DB_ROOT_PASSWORD in this terminal and re-run");
  } else {
    report("fix", "Database and secrets", `setup_local.py failed: ${output.trim().split("\n").slice(-1)[0]}`);
  }
}

async function health() {
  if (!existsSync(join(root, "backend", ".env")) || !existsSync(venvPython))
    return report("skip", "API health check", "needs the database and backend environment");
  // A healthy dashboard already running on 8000 counts; otherwise start a throwaway API.
  const probe = async (port) => {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1500) });
      const body = await response.json().catch(() => ({}));
      return response.ok && body.status === "ok" && body.application === "stack-moko-baby";
    } catch {
      return false;
    }
  };
  if (await probe(8000)) return report("ok", "API health check", "the running API on port 8000 is healthy");
  const port = 8011;
  if (await portOpen(port)) return report("skip", "API health check", `port ${port} is busy; run npm run dev to check by hand`);
  const api = spawn(venvPython, ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(port), "--no-access-log"], {
    cwd: join(root, "backend"),
    stdio: "ignore",
    windowsHide: true,
  });
  try {
    for (let i = 0; i < 40; i++) {
      if (await probe(port)) return report("ok", "API health check", "API started and the database is ready");
      await delay(500);
    }
    report("fix", "API health check", "the API did not become healthy; run npm run dev and read its error");
  } finally {
    api.kill();
  }
}

function cloudflared() {
  const target = process.env.STACK_CLOUDFLARED || join(root, ".tools", "free-online", win ? "cloudflared.exe" : "cloudflared");
  if (existsSync(target)) return report("ok", "Tunnel helper (cloudflared)", "installed");
  if (check || !existsSync(venvPython)) return report("fix", "Tunnel helper (cloudflared)", "missing: run npm run setup (needed for npm run online)");
  console.log("[setup] Downloading the official cloudflared (SHA-256 checked)…");
  if (ok(run(venvPython, [join("scripts", "install-cloudflared.py")], { show: true })))
    report("ok", "Tunnel helper (cloudflared)", "installed in .tools/free-online");
  else report("fix", "Tunnel helper (cloudflared)", "download failed; re-run later (only needed for npm run online)");
}

function ollama() {
  const result = run("ollama", ["--version"], { shell: true });
  if (ok(result)) report("ok", "Ollama (optional)", "installed; Stack Intelligence can use a local model");
  else report("skip", "Ollama (optional)", "not installed; Stack Intelligence still answers without it (winget install --id Ollama.Ollama)");
}

function graphify() {
  if (existsSync(graphifyExe) && ok(run(graphifyExe, ["--version"])))
    return report("ok", "Project map (Graphify)", "scripts\\graphify.cmd works");
  if (check || !python) return report("fix", "Project map (Graphify)", "missing: run npm run setup -- --role developer");
  const venv = join(root, ".tools", "graphify-py313");
  console.log("[setup] Installing Graphify into .tools/graphify-py313…");
  if (!existsSync(join(venv, win ? "Scripts/python.exe" : "bin/python")) &&
      !ok(run(python[0], [...python.slice(1), "-m", "venv", venv], { show: true })))
    return report("fix", "Project map (Graphify)", "could not create .tools/graphify-py313");
  const pip = join(venv, win ? "Scripts/python.exe" : "bin/python");
  if (!ok(run(pip, ["-m", "pip", "install", "--disable-pip-version-check", "-q", "graphifyy[watch,sql]==0.9.109"], { show: true })))
    return report("fix", "Project map (Graphify)", "pip install graphifyy failed");
  report("ok", "Project map (Graphify)", "installed; the committed graph is ready for graphify query");
}

function testBrowser() {
  const edge = ["C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"];
  if (!win || edge.some(existsSync)) report("ok", "Browser tests (Edge)", "Microsoft Edge found");
  else report("fix", "Browser tests (Edge)", `Playwright uses Edge; ${winget(WINGET.edge, "Microsoft Edge")}`);
}

function arduino() {
  const local = join(root, ".tools", "esp32-integration-20261122", "arduino", "arduino-cli.exe");
  const cli = ok(run("arduino-cli", ["version"], { shell: true })) ? "arduino-cli" : existsSync(local) ? local : null;
  if (!cli) return report("fix", "Arduino CLI", winget(WINGET.arduino, "Arduino CLI"));
  report("ok", "Arduino CLI", "found");
  const opts = { shell: cli === "arduino-cli" };
  const cores = run(cli, ["core", "list"], opts);
  const installed = /esp32:esp32\s+(\S+)/.exec(cores.stdout || "")?.[1];
  const label = `ESP32 board core ${ESP32_CORE}`;
  if (installed !== ESP32_CORE) {
    const found = installed ? `${installed} is installed` : "missing";
    if (check) return report("fix", label, `${found}: run npm run setup -- --role bridge`);
    console.log(`[setup] Installing the ESP32 board core ${ESP32_CORE} (large download)…`);
    run(cli, ["core", "update-index", "--additional-urls", ESP32_INDEX], { ...opts, show: true });
    if (!ok(run(cli, ["core", "install", `esp32:esp32@${ESP32_CORE}`, "--additional-urls", ESP32_INDEX], { ...opts, show: true })))
      return report("fix", label, "install failed (see the output above)");
  }
  report("ok", label, "installed");
  if (check) return;
  const flasher = existsSync(venvPython) ? venvPython : python?.[0];
  if (!flasher) return report("skip", "Button bridge build", "needs Python");
  // flash-device.py finds arduino-cli on PATH or in the project's .tools folder by itself.
  const build = run(flasher, [...(flasher === venvPython ? [] : python.slice(1)), join("scripts", "flash-device.py"), "--bridge", "--compile-only"]);
  if (ok(build)) report("ok", "Button bridge build", "compiles; flash with npm run device:bridge -- --port COMx");
  else report("fix", "Button bridge build", "compile failed: run npm run device:bridge -- --compile-only to see why");
  if (win) report("skip", "USB driver", "if no COM port appears for the ESP32, install the CP210x or CH340 driver for your board");
}

// ---------------------------------------------------------------- main
console.log(`Stack Moko Baby setup - roles: ${[...roles].join(", ")}${check ? " (check only, nothing is changed)" : ""}\n`);
checkNode();
const havePython = findPython();
let mysqlUp = false;
if (roles.has("operator")) {
  mysqlUp = await ensureMysql();
  frontendDeps();
  if (havePython || existsSync(venvPython)) backendVenv();
  database(mysqlUp);
  await health();
  cloudflared();
  ollama();
}
if (roles.has("developer")) {
  graphify();
  testBrowser();
}
if (roles.has("bridge")) arduino();

const problems = results.filter((r) => r.status === "fix");
console.log(`\n${problems.length ? `${problems.length} item(s) need attention (marked [!!]).` : "Everything needed for these roles is ready."}`);
if (!problems.length && roles.has("operator")) {
  console.log("Next: npm run dev  -> http://localhost:5173/admin/login (user admin, password in backend/.admin-credentials.txt)");
  console.log("Event day: npm run online, then pair the game screen laptop (SETUP.md, role screen).");
}
process.exit(problems.length ? 1 : 0);
