import { createRequire } from "node:module";
import net from "node:net";

const require = createRequire(import.meta.url);

function reservePort(port: number) {
  return new Promise<net.Server>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

function closeServer(server: net.Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

describe("desktop port selection", () => {
  it("returns preferred port when it is available", async () => {
    const portUtils = require("../../desktop/port-utils.cjs") as {
      findAvailablePort: (input: { host: string; preferredPort: number; maxAttempts?: number }) => Promise<number>;
    };

    const selected = await portUtils.findAvailablePort({
      host: "127.0.0.1",
      preferredPort: 3490,
    });

    expect(selected).toBe(3490);
  });

  it("falls back to next port when preferred port is occupied", async () => {
    const portUtils = require("../../desktop/port-utils.cjs") as {
      findAvailablePort: (input: { host: string; preferredPort: number; maxAttempts?: number }) => Promise<number>;
    };

    const blocked = await reservePort(3491);
    try {
      const selected = await portUtils.findAvailablePort({
        host: "127.0.0.1",
        preferredPort: 3491,
        maxAttempts: 5,
      });
      expect(selected).toBe(3492);
    } finally {
      await closeServer(blocked);
    }
  });
});

