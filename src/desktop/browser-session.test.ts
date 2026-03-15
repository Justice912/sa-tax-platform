import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("desktop browser session preparation", () => {
  it("clears cached renderer assets before loading the local workspace", async () => {
    const sessionModule = require("../../desktop/browser-session.cjs") as {
      prepareBrowserSession: (session: {
        clearCache: () => Promise<void>;
        clearStorageData: (options: { storages: string[] }) => Promise<void>;
      }) => Promise<void>;
    };

    const calls: string[] = [];

    await sessionModule.prepareBrowserSession({
      clearCache: async () => {
        calls.push("clearCache");
      },
      clearStorageData: async ({ storages }) => {
        calls.push(`clearStorageData:${storages.join(",")}`);
      },
    });

    expect(calls).toEqual([
      "clearCache",
      "clearStorageData:serviceworkers,cachestorage,shadercache",
    ]);
  });
});
