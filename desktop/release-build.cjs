const fs = require("node:fs");
const path = require("node:path");

function normalizeFlag(value) {
  if (typeof value !== "string") {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function hasSigningCredentials(env) {
  return typeof env.CSC_LINK === "string" && env.CSC_LINK.length > 0
    && typeof env.CSC_KEY_PASSWORD === "string" && env.CSC_KEY_PASSWORD.length > 0;
}

function resolveSigningMode(env) {
  const forceSigned = normalizeFlag(env.TAXOPS_FORCE_SIGNED);
  const forceUnsigned = normalizeFlag(env.TAXOPS_UNSIGNED);
  const credentialsPresent = hasSigningCredentials(env);

  if (forceSigned && !credentialsPresent) {
    throw new Error("Signed desktop build requires CSC_LINK and CSC_KEY_PASSWORD.");
  }

  if (forceUnsigned) {
    return "unsigned";
  }

  if (forceSigned || credentialsPresent) {
    return "signed";
  }

  return "unsigned";
}

function resolveIconPath(projectRoot) {
  const iconPath = path.join(projectRoot, "build", "icon.ico");
  if (!fs.existsSync(iconPath)) {
    return null;
  }
  return iconPath;
}

function resolveDesktopDistOptions(input) {
  const signingMode = resolveSigningMode(input.env);
  const iconPath = resolveIconPath(input.projectRoot);
  const builderArgs = ["--win", "nsis", `--config.win.signAndEditExecutable=${signingMode === "signed" ? "true" : "false"}`];

  if (iconPath) {
    builderArgs.push(`--config.win.icon=${iconPath}`);
  }

  return {
    builderArgs,
    signingMode,
    iconPath,
  };
}

module.exports = {
  hasSigningCredentials,
  resolveSigningMode,
  resolveIconPath,
  resolveDesktopDistOptions,
};
