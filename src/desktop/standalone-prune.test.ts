import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("desktop standalone prune", () => {
  it("removes non-runtime directories and keeps runtime directories", () => {
    const pruneModule = require("../../desktop/standalone-prune.cjs") as {
      pruneStandaloneTree: (input: { standaloneRoot: string }) => { removed: string[] };
    };

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "taxops-standalone-"));
    const standaloneRoot = path.join(tempRoot, ".next", "standalone");

    const mustKeep = [".next", "node_modules", "public", "prisma"];
    const shouldRemove = [
      "src",
      "docs",
      "tests",
      ".preview",
      ".preview-fix",
      ".preview-latest",
      "storage",
      "desktop",
      "dist",
    ];

    for (const dir of [...mustKeep, ...shouldRemove]) {
      fs.mkdirSync(path.join(standaloneRoot, dir), { recursive: true });
      fs.writeFileSync(path.join(standaloneRoot, dir, "marker.txt"), "x");
    }

    const result = pruneModule.pruneStandaloneTree({ standaloneRoot });

    for (const dir of mustKeep) {
      expect(fs.existsSync(path.join(standaloneRoot, dir))).toBe(true);
    }

    for (const dir of shouldRemove) {
      expect(fs.existsSync(path.join(standaloneRoot, dir))).toBe(false);
    }

    expect(result.removed.length).toBeGreaterThan(0);
  });
});
