const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { app, BrowserWindow, ipcMain, Menu, shell } = require("electron");
const { prepareBrowserSession } = require("./browser-session.cjs");
const { openDesktopFile, printDesktopFile, saveDesktopFileAs } = require("./file-actions.cjs");
const { restoreGoldenDemoData } = require("./golden-demo-restore.cjs");
const { resolveDesktopServerMode, resolveStandalonePaths } = require("./runtime-paths.cjs");
const { findAvailablePort } = require("./port-utils.cjs");

const host = process.env.DESKTOP_NEXT_HOST ?? "127.0.0.1";
const preferredPort = Number.parseInt(process.env.DESKTOP_NEXT_PORT ?? "3400", 10);
const isDevToolsEnabled = process.env.TAXOPS_DEVTOOLS === "true";

let mainWindow = null;
let localServerProcess = null;
let activeAppUrl = "";

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
}

function getStartupLogPath() {
  return path.join(app.getPath("userData"), "desktop-startup.log");
}

function writeStartupLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.appendFileSync(getStartupLogPath(), line, "utf8");
  } catch {
    // Ignore log write errors.
  }
}

function getDesktopStorageRoot() {
  return path.join(app.getPath("userData"), "storage");
}

function shouldRestoreGoldenDemoData() {
  return (process.env.DEMO_MODE ?? "true").toLowerCase() !== "false";
}

function getLoadingHtml(message) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>TaxOps ZA</title>
    <style>
      body { margin: 0; font-family: Segoe UI, Arial, sans-serif; background: #0b2a3d; color: #f1f5f9; }
      .wrap { min-height: 100vh; display: grid; place-items: center; }
      .card { width: min(560px, 92vw); border: 1px solid #16435f; border-radius: 16px; padding: 28px; background: #0e2433; }
      h1 { margin: 0 0 10px; font-size: 24px; }
      p { margin: 0; color: #cbd5e1; line-height: 1.45; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>TaxOps ZA</h1>
        <p>${message}</p>
      </div>
    </div>
  </body>
</html>`;
}

function getErrorHtml(errorMessage) {
  const startupLogPath = getStartupLogPath().replaceAll("\\", "\\\\");
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>TaxOps ZA Startup Error</title>
    <style>
      body { margin: 0; font-family: Segoe UI, Arial, sans-serif; background: #2b1111; color: #f8fafc; }
      .wrap { min-height: 100vh; display: grid; place-items: center; }
      .card { width: min(680px, 94vw); border: 1px solid #7f1d1d; border-radius: 16px; padding: 24px; background: #3a1616; }
      h1 { margin: 0 0 12px; font-size: 24px; }
      p { margin: 0 0 10px; color: #fecaca; line-height: 1.45; }
      code { display: block; padding: 10px; border-radius: 8px; background: #1f0a0a; color: #fde68a; overflow-wrap: anywhere; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>TaxOps ZA Could Not Start</h1>
        <p>${errorMessage}</p>
        <p>Startup log:</p>
        <code>${startupLogPath}</code>
      </div>
    </div>
  </body>
</html>`;
}

function wait(durationMs) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
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
    await wait(1000);
  }
  throw new Error(`Timed out waiting for desktop server at ${url}`);
}

function stopLocalServer() {
  if (localServerProcess && !localServerProcess.killed) {
    localServerProcess.kill();
  }
  localServerProcess = null;
}

async function startLocalStandaloneServer() {
  const runtimePaths = resolveStandalonePaths({
    isPackaged: app.isPackaged,
    appPath: app.getAppPath(),
    resourcesPath: process.resourcesPath,
  });

  if (!fs.existsSync(runtimePaths.serverEntry)) {
    throw new Error(`Missing standalone server entry: ${runtimePaths.serverEntry}`);
  }

  const runtimePort = await findAvailablePort({
    host,
    preferredPort: Number.isNaN(preferredPort) ? 3400 : preferredPort,
  });
  const appUrl = `http://${host}:${String(runtimePort)}`;
  const storageRoot = getDesktopStorageRoot();
  fs.mkdirSync(storageRoot, { recursive: true });

  localServerProcess = spawn(process.execPath, [runtimePaths.serverEntry], {
    cwd: runtimePaths.standaloneRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(runtimePort),
      HOSTNAME: host,
      NEXTAUTH_URL: appUrl,
      STORAGE_ROOT: storageRoot,
      DEMO_MODE: process.env.DEMO_MODE ?? "true",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "taxops-desktop-local-secret-2026",
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://demo:demo@localhost:5432/demo?schema=public",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  writeStartupLog(`Started standalone server process PID=${String(localServerProcess.pid)} URL=${appUrl}`);

  localServerProcess.stdout?.on("data", (chunk) => {
    writeStartupLog(`server: ${String(chunk).trim()}`);
  });

  localServerProcess.stderr?.on("data", (chunk) => {
    writeStartupLog(`server-error: ${String(chunk).trim()}`);
  });

  const serverExitPromise = new Promise((_, reject) => {
    localServerProcess.once("exit", (code) => {
      reject(new Error(`Standalone server exited before ready (code=${String(code)}).`));
    });
  });

  await Promise.race([waitForServer(`${appUrl}/login`), serverExitPromise]);

  return appUrl;
}

function createMenu() {
  const template = [
    {
      label: "Application",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "togglefullscreen" },
        ...(isDevToolsEnabled ? [{ role: "toggleDevTools" }] : []),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 960,
    minWidth: 1280,
    minHeight: 760,
    show: true,
    title: "TaxOps ZA Desktop",
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch(() => null);
    return { action: "deny" };
  });

  mainWindow.once("ready-to-show", () => {
    if (!mainWindow) {
      return;
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
    if (isDevToolsEnabled) {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  });

  const loadingHtml = getLoadingHtml("Starting your local compliance workspace...");
  mainWindow.loadURL(`data:text/html,${encodeURIComponent(loadingHtml)}`).catch(() => null);
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

async function bootstrapDesktopApp() {
  createMenu();
  createWindow();

  try {
    try {
      await prepareBrowserSession(mainWindow.webContents.session);
      writeStartupLog("Cleared desktop renderer cache before loading workspace.");
    } catch (error) {
      writeStartupLog(`cache-clear-warning: ${String(error?.stack ?? error)}`);
    }

    if (shouldRestoreGoldenDemoData()) {
      try {
        const result = restoreGoldenDemoData({
          storageRoot: getDesktopStorageRoot(),
        });
        writeStartupLog(
          `Golden demo bundle restored in ${result.storageRoot} (estates=${String(result.estateCount)}, assessments=${String(result.individualTaxAssessmentCount)}, engineRuns=${String(result.estateEngineRunCount)}).`,
        );
      } catch (error) {
        writeStartupLog(`golden-demo-restore-warning: ${String(error?.stack ?? error)}`);
      }
    }

    const serverMode = resolveDesktopServerMode({
      appUrl: process.env.APP_URL,
    });

    if (serverMode.mode === "external-url") {
      activeAppUrl = serverMode.appUrl;
    } else {
      activeAppUrl = await startLocalStandaloneServer();
    }

    await mainWindow.loadURL(activeAppUrl);
    focusMainWindow();
  } catch (error) {
    stopLocalServer();
    writeStartupLog(`startup-error: ${String(error?.stack ?? error)}`);
    const errorHtml = getErrorHtml(
      "Desktop startup failed. Please close the app and relaunch. If this continues, share the startup log path shown below.",
    );
    if (mainWindow && !mainWindow.isDestroyed()) {
      await mainWindow.loadURL(`data:text/html,${encodeURIComponent(errorHtml)}`).catch(() => null);
      focusMainWindow();
    } else {
      throw error;
    }
  }
}

ipcMain.handle("taxops:get-app-meta", () => ({
  name: app.getName(),
  version: app.getVersion(),
  platform: process.platform,
}));

ipcMain.handle("taxops:open-file", async (_event, filePath) => openDesktopFile(filePath));
ipcMain.handle("taxops:print-file", async (_event, filePath) => printDesktopFile(filePath));
ipcMain.handle("taxops:save-file-as", async (_event, filePath, suggestedName) =>
  saveDesktopFileAs(filePath, suggestedName),
);

app.on("second-instance", () => {
  focusMainWindow();
});

app.whenReady().then(async () => {
  await bootstrapDesktopApp();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await bootstrapDesktopApp();
      return;
    }
    focusMainWindow();
  });
}).catch((error) => {
  writeStartupLog(`fatal-startup-error: ${String(error?.stack ?? error)}`);
  app.quit();
});

app.on("before-quit", () => {
  stopLocalServer();
});

app.on("window-all-closed", () => {
  stopLocalServer();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
