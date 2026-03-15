import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("desktop standalone prepare", () => {
  it("syncs the refreshed standalone runtime into the packaged desktop-refresh app when present", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "taxops-prepare-standalone-"));
    const projectRoot = path.join(tempRoot, "project");
    const standaloneRoot = path.join(projectRoot, ".next", "standalone");
    const staticRoot = path.join(projectRoot, ".next", "static");
    const publicRoot = path.join(projectRoot, "public");
    const packagedRuntimeRoot = path.join(
      projectRoot,
      "dist",
      "desktop-refresh",
      "win-unpacked",
      "resources",
      "next",
      "standalone",
    );

    fs.mkdirSync(path.join(standaloneRoot, ".next"), { recursive: true });
    fs.mkdirSync(path.join(staticRoot, "chunks"), { recursive: true });
    fs.mkdirSync(publicRoot, { recursive: true });
    fs.mkdirSync(packagedRuntimeRoot, { recursive: true });

    fs.writeFileSync(path.join(standaloneRoot, "server.js"), "console.log('fresh');");
    fs.writeFileSync(path.join(staticRoot, "chunks", "app.css"), "body{}");
    fs.writeFileSync(path.join(publicRoot, "favicon.ico"), "icon");
    fs.writeFileSync(path.join(packagedRuntimeRoot, "stale.txt"), "old");

    const prepareModule = require("../../desktop/prepare-standalone.cjs") as {
      prepareStandaloneAssets: (input: { projectRoot: string }) => void;
    };

    prepareModule.prepareStandaloneAssets({ projectRoot });

    expect(
      fs.existsSync(path.join(packagedRuntimeRoot, "server.js")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(packagedRuntimeRoot, ".next", "static", "chunks", "app.css")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(packagedRuntimeRoot, "public", "favicon.ico")),
    ).toBe(true);
    expect(fs.existsSync(path.join(packagedRuntimeRoot, "stale.txt"))).toBe(false);
  });
});
