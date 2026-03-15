import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type RuntimePaths = {
  standaloneRoot: string;
  serverEntry: string;
  staticDir: string;
  publicDir: string;
};

type DesktopServerMode = {
  mode: "external-url" | "local-standalone";
  appUrl?: string;
};

describe("desktop runtime path helpers", () => {
  it("resolves unpackaged standalone paths from project root", () => {
    const runtimePaths = require("../../desktop/runtime-paths.cjs") as {
      resolveStandalonePaths: (input: {
        isPackaged: boolean;
        appPath: string;
        resourcesPath: string;
      }) => RuntimePaths;
    };

    const resolved = runtimePaths.resolveStandalonePaths({
      isPackaged: false,
      appPath: "C:\\repo\\sa-tax-platform",
      resourcesPath: "C:\\Users\\HP\\AppData\\Local\\TaxOps\\resources",
    });

    expect(resolved.serverEntry).toBe("C:\\repo\\sa-tax-platform\\.next\\standalone\\server.js");
    expect(resolved.staticDir).toBe("C:\\repo\\sa-tax-platform\\.next\\standalone\\.next\\static");
    expect(resolved.publicDir).toBe("C:\\repo\\sa-tax-platform\\.next\\standalone\\public");
  });

  it("resolves packaged standalone paths from resources directory", () => {
    const runtimePaths = require("../../desktop/runtime-paths.cjs") as {
      resolveStandalonePaths: (input: {
        isPackaged: boolean;
        appPath: string;
        resourcesPath: string;
      }) => RuntimePaths;
    };

    const resolved = runtimePaths.resolveStandalonePaths({
      isPackaged: true,
      appPath: "C:\\Users\\HP\\AppData\\Local\\Programs\\TaxOps\\resources\\app.asar",
      resourcesPath: "C:\\Users\\HP\\AppData\\Local\\Programs\\TaxOps\\resources",
    });

    expect(resolved.serverEntry).toBe("C:\\Users\\HP\\AppData\\Local\\Programs\\TaxOps\\resources\\next\\standalone\\server.js");
    expect(resolved.staticDir).toBe("C:\\Users\\HP\\AppData\\Local\\Programs\\TaxOps\\resources\\next\\standalone\\.next\\static");
    expect(resolved.publicDir).toBe("C:\\Users\\HP\\AppData\\Local\\Programs\\TaxOps\\resources\\next\\standalone\\public");
  });

  it("uses external-url mode when APP_URL is set", () => {
    const runtimePaths = require("../../desktop/runtime-paths.cjs") as {
      resolveDesktopServerMode: (input: { appUrl?: string | null }) => DesktopServerMode;
    };

    const resolved = runtimePaths.resolveDesktopServerMode({
      appUrl: "http://127.0.0.1:3300",
    });

    expect(resolved).toEqual({
      mode: "external-url",
      appUrl: "http://127.0.0.1:3300",
    });
  });

  it("uses local-standalone mode when APP_URL is empty", () => {
    const runtimePaths = require("../../desktop/runtime-paths.cjs") as {
      resolveDesktopServerMode: (input: { appUrl?: string | null }) => DesktopServerMode;
    };

    const resolved = runtimePaths.resolveDesktopServerMode({
      appUrl: "",
    });

    expect(resolved).toEqual({
      mode: "local-standalone",
    });
  });
});
