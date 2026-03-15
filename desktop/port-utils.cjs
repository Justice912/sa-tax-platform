const net = require("node:net");

function isPortAvailable({ host, port }) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();

    server.once("error", () => {
      resolve(false);
    });

    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(input) {
  const maxAttempts = input.maxAttempts ?? 20;

  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidate = input.preferredPort + offset;
    const available = await isPortAvailable({
      host: input.host,
      port: candidate,
    });

    if (available) {
      return candidate;
    }
  }

  throw new Error(
    `No available port found after ${String(maxAttempts)} attempts starting at ${String(input.preferredPort)}.`,
  );
}

module.exports = {
  findAvailablePort,
};
