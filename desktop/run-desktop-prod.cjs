const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const cwd = process.cwd();

function run(command, args, envOverrides = {}) {
  return spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...envOverrides },
  });
}

function runAndWait(command, args, envOverrides = {}) {
  return new Promise((resolve, reject) => {
    const child = run(command, args, envOverrides);
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${String(code)}`));
    });
  });
}

function resolveElectronBinary() {
  const binaryName = process.platform === "win32" ? "electron.cmd" : "electron";
  return path.join(cwd, "node_modules", ".bin", binaryName);
}

async function runDesktop() {
  const serverEntry = path.join(cwd, ".next", "standalone", "server.js");
  if (!fs.existsSync(serverEntry)) {
    console.error("Missing .next/standalone/server.js. Run `npm run build` first.");
    process.exit(1);
  }

  await runAndWait("node", ["desktop/prepare-standalone.cjs"]);

  const electronProcess = run(resolveElectronBinary(), ["."]);

  electronProcess.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

runDesktop().catch((error) => {
  console.error(error);
  process.exit(1);
});
