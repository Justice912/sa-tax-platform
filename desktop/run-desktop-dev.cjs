const path = require("node:path");
const { spawn } = require("node:child_process");

const host = "127.0.0.1";
const port = process.env.DESKTOP_NEXT_PORT ?? "3300";
const appUrl = `http://${host}:${port}`;
const cwd = process.cwd();

function run(command, args, envOverrides = {}) {
  return spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...envOverrides },
  });
}

async function waitForServer(url, timeoutMs = 120000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch {
      // Ignore until startup completes.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for Next.js server at ${url}`);
}

function resolveElectronBinary() {
  const binaryName = process.platform === "win32" ? "electron.cmd" : "electron";
  return path.join(cwd, "node_modules", ".bin", binaryName);
}

async function runDesktop() {
  const nextServer = run(
    "npm",
    ["run", "dev", "--", "--hostname", host, "--port", port],
    {
      NEXTAUTH_URL: appUrl,
    },
  );

  const shutdown = () => {
    if (!nextServer.killed) {
      nextServer.kill();
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("exit", shutdown);

  try {
    await waitForServer(`${appUrl}/login`);
  } catch (error) {
    shutdown();
    console.error(error);
    process.exit(1);
  }

  const electronProcess = run(resolveElectronBinary(), ["."], {
    APP_URL: appUrl,
    TAXOPS_DEVTOOLS: "false",
  });

  electronProcess.on("exit", (code) => {
    shutdown();
    process.exit(code ?? 0);
  });

  nextServer.on("exit", (code) => {
    if (code !== 0 && !electronProcess.killed) {
      electronProcess.kill();
      process.exit(code ?? 1);
    }
  });
}

runDesktop().catch((error) => {
  console.error(error);
  process.exit(1);
});

