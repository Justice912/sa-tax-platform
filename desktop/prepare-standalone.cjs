const fs = require("node:fs");
const path = require("node:path");
const { pruneStandaloneTree } = require("./standalone-prune.cjs");
const { syncStandaloneRuntime } = require("./standalone-sync.cjs");

function ensureExists(targetPath, description) {
  if (!fs.existsSync(targetPath)) {
    console.error(`Missing ${description}: ${targetPath}`);
    process.exit(1);
  }
}

function copyDir(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, force: true });
}

function prepareStandaloneAssets(input = {}) {
  const projectRoot = input.projectRoot ?? process.cwd();
  const standaloneRoot = path.join(projectRoot, ".next", "standalone");
  const standaloneNextRoot = path.join(standaloneRoot, ".next");
  const sourceStatic = path.join(projectRoot, ".next", "static");
  const targetStatic = path.join(standaloneNextRoot, "static");
  const sourcePublic = path.join(projectRoot, "public");
  const targetPublic = path.join(standaloneRoot, "public");
  const packagedRuntimeRoot = path.join(
    projectRoot,
    "dist",
    "desktop-refresh",
    "win-unpacked",
    "resources",
    "next",
    "standalone",
  );

  ensureExists(standaloneRoot, "Next standalone output");
  ensureExists(sourceStatic, "Next static output");
  ensureExists(sourcePublic, "public directory");

  copyDir(sourceStatic, targetStatic);
  copyDir(sourcePublic, targetPublic);

  const pruneResult = pruneStandaloneTree({
    standaloneRoot,
  });

  if (fs.existsSync(packagedRuntimeRoot)) {
    syncStandaloneRuntime({
      sourceRoot: standaloneRoot,
      destinationRoot: packagedRuntimeRoot,
    });
  }

  return {
    removed: pruneResult.removed,
    packagedRuntimeSynced: fs.existsSync(packagedRuntimeRoot),
  };
}

if (require.main === module) {
  const result = prepareStandaloneAssets();
  console.log(`Standalone assets prepared for desktop runtime. Pruned directories: ${result.removed.join(", ") || "none"}.`);
}

module.exports = {
  prepareStandaloneAssets,
};
