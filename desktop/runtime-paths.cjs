const path = require("node:path");

function resolveStandalonePaths(input) {
  const baseDir = input.isPackaged
    ? path.join(input.resourcesPath, "next", "standalone")
    : path.join(input.appPath, ".next", "standalone");

  return {
    standaloneRoot: baseDir,
    serverEntry: path.join(baseDir, "server.js"),
    staticDir: path.join(baseDir, ".next", "static"),
    publicDir: path.join(baseDir, "public"),
  };
}

function resolveDesktopServerMode(input) {
  const rawUrl = typeof input.appUrl === "string" ? input.appUrl.trim() : "";

  if (rawUrl.length > 0) {
    return {
      mode: "external-url",
      appUrl: rawUrl,
    };
  }

  return {
    mode: "local-standalone",
  };
}

module.exports = {
  resolveStandalonePaths,
  resolveDesktopServerMode,
};

