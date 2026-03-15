const fs = require("node:fs");
const path = require("node:path");

function isPermissionError(error) {
  return error && (error.code === "EPERM" || error.code === "EBUSY");
}

function removeEntry(entryPath) {
  fs.rmSync(entryPath, { recursive: true, force: true });
}

function pruneStaleEntries(sourceRoot, destinationRoot) {
  if (!fs.existsSync(destinationRoot)) {
    return;
  }

  for (const name of fs.readdirSync(destinationRoot)) {
    const sourceEntry = path.join(sourceRoot, name);
    const destinationEntry = path.join(destinationRoot, name);

    if (!fs.existsSync(sourceEntry)) {
      try {
        removeEntry(destinationEntry);
      } catch (error) {
        if (!isPermissionError(error)) {
          throw error;
        }
      }
      continue;
    }

    const sourceStat = fs.lstatSync(sourceEntry);
    const destinationStat = fs.lstatSync(destinationEntry);

    if (sourceStat.isDirectory() && destinationStat.isDirectory()) {
      pruneStaleEntries(sourceEntry, destinationEntry);
      continue;
    }

    if (sourceStat.isDirectory() !== destinationStat.isDirectory()) {
      try {
        removeEntry(destinationEntry);
      } catch (error) {
        if (!isPermissionError(error)) {
          throw error;
        }
      }
    }
  }
}

function copyEntries(sourceRoot, destinationRoot) {
  fs.mkdirSync(destinationRoot, { recursive: true });

  for (const name of fs.readdirSync(sourceRoot)) {
    const sourceEntry = path.join(sourceRoot, name);
    const destinationEntry = path.join(destinationRoot, name);
    const sourceStat = fs.lstatSync(sourceEntry);

    if (sourceStat.isSymbolicLink()) {
      const resolvedStat = fs.statSync(sourceEntry);

      try {
        removeEntry(destinationEntry);
      } catch (error) {
        if (!isPermissionError(error)) {
          throw error;
        }
      }

      if (resolvedStat.isDirectory()) {
        copyEntries(sourceEntry, destinationEntry);
      } else {
        fs.mkdirSync(path.dirname(destinationEntry), { recursive: true });
        fs.copyFileSync(sourceEntry, destinationEntry);
      }
      continue;
    }

    if (sourceStat.isDirectory()) {
      copyEntries(sourceEntry, destinationEntry);
      continue;
    }

    fs.mkdirSync(path.dirname(destinationEntry), { recursive: true });
    try {
      fs.copyFileSync(sourceEntry, destinationEntry);
    } catch (error) {
      if (!(isPermissionError(error) && fs.existsSync(destinationEntry))) {
        throw error;
      }
    }
  }
}

function syncInPlace(sourceRoot, destinationRoot) {
  pruneStaleEntries(sourceRoot, destinationRoot);
  copyEntries(sourceRoot, destinationRoot);
}

function syncStandaloneRuntime(input) {
  if (!fs.existsSync(input.sourceRoot)) {
    throw new Error(`Standalone source does not exist: ${input.sourceRoot}`);
  }

  try {
    fs.rmSync(input.destinationRoot, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(input.destinationRoot), { recursive: true });
    fs.cpSync(input.sourceRoot, input.destinationRoot, { recursive: true, force: true });
  } catch (error) {
    if (!isPermissionError(error)) {
      throw error;
    }

    syncInPlace(input.sourceRoot, input.destinationRoot);
  }
}

module.exports = {
  syncStandaloneRuntime,
};
