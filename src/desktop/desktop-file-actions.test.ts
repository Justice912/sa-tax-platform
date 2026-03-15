import Module from "node:module";
import { beforeEach, describe, expect, it, vi } from "vitest";

const exposeInMainWorld = vi.fn();
const invoke = vi.fn();
const originalLoad = Module._load;

describe("desktop preload bridge", () => {
  beforeEach(() => {
    vi.resetModules();
    exposeInMainWorld.mockReset();
    invoke.mockReset();
    Module._load = function patchedLoader(request, parent, isMain) {
      if (request === "electron") {
        return {
          contextBridge: {
            exposeInMainWorld,
          },
          ipcRenderer: {
            invoke,
          },
        };
      }

      return originalLoad.call(this, request, parent, isMain);
    };
  });

  it("exposes file open and print actions to the desktop renderer", async () => {
    await import("../../desktop/preload.cjs");

    expect(exposeInMainWorld).toHaveBeenCalledWith(
      "taxOpsDesktop",
      expect.objectContaining({
        openFile: expect.any(Function),
        printFile: expect.any(Function),
        saveFileAs: expect.any(Function),
      }),
    );
  });
});
