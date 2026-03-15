const fs = require("node:fs");
const path = require("node:path");

const PRUNE_DIRECTORY_NAMES = [
  "src",
  "docs",
  "tests",
  "desktop",
  "dist",
  "storage",
  ".preview",
  ".preview-fix",
  ".preview-latest",
  ".preview-live",
  ".preview-phase",
];

function pruneStandaloneTree(input) {
  const removed = [];

  for (const directoryName of PRUNE_DIRECTORY_NAMES) {
    const target = path.join(input.standaloneRoot, directoryName);
    if (!fs.existsSync(target)) {
      continue;
    }

    fs.rmSync(target, { recursive: true, force: true });
    removed.push(directoryName);
  }

  return {
    removed,
  };
}

module.exports = {
  PRUNE_DIRECTORY_NAMES,
  pruneStandaloneTree,
};
