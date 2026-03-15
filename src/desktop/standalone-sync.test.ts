import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("desktop standalone sync", () => {
  it("copies hidden .next static assets into the packaged runtime and removes stale files", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "taxops-standalone-sync-"));
    const sourceRoot = path.join(tempRoot, "source");
    const destinationRoot = path.join(tempRoot, "destination");

    fs.mkdirSync(path.join(sourceRoot, ".next", "static", "chunks"), { recursive: true });
    fs.mkdirSync(path.join(sourceRoot, ".next", "static", "media"), { recursive: true });
    fs.writeFileSync(path.join(sourceRoot, "server.js"), "console.log('server');");
    fs.writeFileSync(
      path.join(sourceRoot, ".next", "static", "chunks", "app.css"),
      "body { background: #fff; }",
    );
    fs.writeFileSync(
      path.join(sourceRoot, ".next", "static", "media", "icon.svg"),
      "<svg />",
    );

    fs.mkdirSync(destinationRoot, { recursive: true });
    fs.writeFileSync(path.join(destinationRoot, "stale.txt"), "remove me");

    const syncModule = require("../../desktop/standalone-sync.cjs") as {
      syncStandaloneRuntime: (input: { sourceRoot: string; destinationRoot: string }) => void;
    };

    syncModule.syncStandaloneRuntime({
      sourceRoot,
      destinationRoot,
    });

    expect(fs.existsSync(path.join(destinationRoot, "server.js"))).toBe(true);
    expect(
      fs.existsSync(path.join(destinationRoot, ".next", "static", "chunks", "app.css")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(destinationRoot, ".next", "static", "media", "icon.svg")),
    ).toBe(true);
    expect(fs.existsSync(path.join(destinationRoot, "stale.txt"))).toBe(false);
  });

  it("falls back to an in-place sync when removing the packaged runtime root hits EPERM", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "taxops-standalone-sync-eperm-"));
    const sourceRoot = path.join(tempRoot, "source");
    const destinationRoot = path.join(tempRoot, "destination");
    const lockedEnginePath = path.join(
      destinationRoot,
      "node_modules",
      ".prisma",
      "client",
      "query_engine-windows.dll.node",
    );

    fs.mkdirSync(path.join(sourceRoot, ".next", "static", "chunks"), { recursive: true });
    fs.mkdirSync(path.join(sourceRoot, "node_modules", ".prisma", "client"), { recursive: true });
    fs.writeFileSync(path.join(sourceRoot, "server.js"), "console.log('fresh');");
    fs.writeFileSync(
      path.join(sourceRoot, ".next", "static", "chunks", "app.css"),
      "body { background: #fff; }",
    );
    fs.writeFileSync(
      path.join(sourceRoot, "node_modules", ".prisma", "client", "query_engine-windows.dll.node"),
      "new-engine",
    );

    fs.mkdirSync(path.dirname(lockedEnginePath), { recursive: true });
    fs.writeFileSync(lockedEnginePath, "locked-engine");
    fs.writeFileSync(path.join(destinationRoot, "stale.txt"), "remove me");

    const syncModule = require("../../desktop/standalone-sync.cjs") as {
      syncStandaloneRuntime: (input: { sourceRoot: string; destinationRoot: string }) => void;
    };

    const originalRmSync = fs.rmSync;
    fs.rmSync = ((targetPath: fs.PathLike, options?: fs.RmOptions) => {
      if (String(targetPath) === destinationRoot) {
        const error = new Error(`EPERM: operation not permitted, unlink '${destinationRoot}'`) as NodeJS.ErrnoException;
        error.code = "EPERM";
        throw error;
      }

      return originalRmSync(targetPath, options);
    }) as typeof fs.rmSync;

    try {
      syncModule.syncStandaloneRuntime({
        sourceRoot,
        destinationRoot,
      });
    } finally {
      fs.rmSync = originalRmSync;
    }

    expect(fs.existsSync(path.join(destinationRoot, "server.js"))).toBe(true);
    expect(
      fs.existsSync(path.join(destinationRoot, ".next", "static", "chunks", "app.css")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(destinationRoot, "node_modules", ".prisma", "client", "query_engine-windows.dll.node")),
    ).toBe(true);
    expect(fs.existsSync(path.join(destinationRoot, "stale.txt"))).toBe(false);
  });

  it("copies Prisma junction entries correctly during the EPERM fallback sync", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "taxops-standalone-sync-junction-"));
    const sourceRoot = path.join(tempRoot, "source");
    const destinationRoot = path.join(tempRoot, "destination");
    const prismaClientRoot = path.join(sourceRoot, "node_modules", "@prisma", "client");
    const standalonePrismaLink = path.join(
      sourceRoot,
      ".next",
      "node_modules",
      "@prisma",
      "client-hash",
    );

    fs.mkdirSync(prismaClientRoot, { recursive: true });
    fs.mkdirSync(path.join(sourceRoot, ".next", "node_modules", "@prisma"), { recursive: true });
    fs.writeFileSync(path.join(prismaClientRoot, "index.js"), "module.exports = {};");
    fs.symlinkSync(prismaClientRoot, standalonePrismaLink, "junction");

    const syncModule = require("../../desktop/standalone-sync.cjs") as {
      syncStandaloneRuntime: (input: { sourceRoot: string; destinationRoot: string }) => void;
    };

    const originalRmSync = fs.rmSync;
    fs.rmSync = ((targetPath: fs.PathLike, options?: fs.RmOptions) => {
      if (String(targetPath) === destinationRoot) {
        const error = new Error(`EPERM: operation not permitted, unlink '${destinationRoot}'`) as NodeJS.ErrnoException;
        error.code = "EPERM";
        throw error;
      }

      return originalRmSync(targetPath, options);
    }) as typeof fs.rmSync;

    try {
      syncModule.syncStandaloneRuntime({
        sourceRoot,
        destinationRoot,
      });
    } finally {
      fs.rmSync = originalRmSync;
    }

    expect(
      fs.existsSync(
        path.join(destinationRoot, ".next", "node_modules", "@prisma", "client-hash", "index.js"),
      ),
    ).toBe(true);
  });
});
