const path = require("node:path");
const { spawn } = require("node:child_process");
const { resolveDesktopDistOptions } = require("./release-build.cjs");

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

async function runDesktopDistribution() {
  await runAndWait("npm", ["run", "desktop:bundle"]);

  const options = resolveDesktopDistOptions({
    projectRoot: cwd,
    env: process.env,
  });

  console.log(`Desktop dist mode: ${options.signingMode}`);
  if (options.iconPath) {
    console.log(`Using desktop icon: ${path.relative(cwd, options.iconPath)}`);
  } else {
    console.log("No custom desktop icon found at build/icon.ico; using Electron default icon.");
  }

  await runAndWait("npx", ["electron-builder", ...options.builderArgs]);
}

runDesktopDistribution().catch((error) => {
  console.error(error);
  process.exit(1);
});

