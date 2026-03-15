import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type BuildOptions = {
  builderArgs: string[];
  signingMode: "signed" | "unsigned";
  iconPath: string | null;
};

describe("desktop release build config", () => {
  it("defaults to unsigned build when signing credentials are absent", () => {
    const configModule = require("../../desktop/release-build.cjs") as {
      resolveDesktopDistOptions: (input: { projectRoot: string; env: Record<string, string | undefined> }) => BuildOptions;
    };

    const options = configModule.resolveDesktopDistOptions({
      projectRoot: "C:\\repo\\sa-tax-platform",
      env: {},
    });

    expect(options.signingMode).toBe("unsigned");
    expect(options.builderArgs).toContain("--config.win.signAndEditExecutable=false");
  });

  it("switches to signed build when certificate env vars are present", () => {
    const configModule = require("../../desktop/release-build.cjs") as {
      resolveDesktopDistOptions: (input: { projectRoot: string; env: Record<string, string | undefined> }) => BuildOptions;
    };

    const options = configModule.resolveDesktopDistOptions({
      projectRoot: "C:\\repo\\sa-tax-platform",
      env: {
        CSC_LINK: "file:///certificates/taxops.pfx",
        CSC_KEY_PASSWORD: "secret",
      },
    });

    expect(options.signingMode).toBe("signed");
    expect(options.builderArgs).toContain("--config.win.signAndEditExecutable=true");
  });

  it("includes custom icon when build/icon.ico exists", () => {
    const configModule = require("../../desktop/release-build.cjs") as {
      resolveDesktopDistOptions: (input: { projectRoot: string; env: Record<string, string | undefined> }) => BuildOptions;
    };

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "taxops-icon-"));
    const buildDir = path.join(tempRoot, "build");
    const iconPath = path.join(buildDir, "icon.ico");
    fs.mkdirSync(buildDir, { recursive: true });
    fs.writeFileSync(iconPath, "placeholder");

    const options = configModule.resolveDesktopDistOptions({
      projectRoot: tempRoot,
      env: {},
    });

    expect(options.iconPath).toBe(iconPath);
    expect(options.builderArgs).toContain(`--config.win.icon=${iconPath}`);
  });

  it("throws when signing is forced without certificate credentials", () => {
    const configModule = require("../../desktop/release-build.cjs") as {
      resolveDesktopDistOptions: (input: { projectRoot: string; env: Record<string, string | undefined> }) => BuildOptions;
    };

    expect(() =>
      configModule.resolveDesktopDistOptions({
        projectRoot: "C:\\repo\\sa-tax-platform",
        env: {
          TAXOPS_FORCE_SIGNED: "true",
        },
      }),
    ).toThrow("requires CSC_LINK and CSC_KEY_PASSWORD");
  });
});
