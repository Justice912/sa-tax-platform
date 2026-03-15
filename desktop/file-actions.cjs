const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { app, dialog, shell } = require("electron");

function resolveExistingFilePath(filePath) {
  if (typeof filePath !== "string" || filePath.trim().length === 0) {
    throw new Error("A valid local file path is required.");
  }

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  return resolvedPath;
}

async function openDesktopFile(filePath) {
  const resolvedPath = resolveExistingFilePath(filePath);
  const openResult = await shell.openPath(resolvedPath);
  if (openResult) {
    throw new Error(openResult);
  }

  return {
    filePath: resolvedPath,
  };
}

async function printDesktopFile(filePath) {
  const resolvedPath = resolveExistingFilePath(filePath);
  const escapedPath = resolvedPath.replace(/'/g, "''");

  await new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Start-Process -LiteralPath '${escapedPath}' -Verb Print`,
      ],
      {
        windowsHide: true,
      },
    );

    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(stderr.trim() || `Printing failed with exit code ${String(code)}.`));
    });
  });

  return {
    filePath: resolvedPath,
  };
}

async function saveDesktopFileAs(filePath, suggestedName) {
  const resolvedPath = resolveExistingFilePath(filePath);
  const defaultPath = path.join(
    app.getPath("downloads"),
    typeof suggestedName === "string" && suggestedName.trim().length > 0
      ? suggestedName.trim()
      : path.basename(resolvedPath),
  );

  const result = await dialog.showSaveDialog({
    title: "Save TaxOps ZA report",
    defaultPath,
  });

  if (result.canceled || !result.filePath) {
    return {
      cancelled: true,
      filePath: resolvedPath,
    };
  }

  await fsPromises.copyFile(resolvedPath, result.filePath);

  return {
    cancelled: false,
    filePath: result.filePath,
  };
}

module.exports = {
  openDesktopFile,
  printDesktopFile,
  saveDesktopFileAs,
  resolveExistingFilePath,
};
