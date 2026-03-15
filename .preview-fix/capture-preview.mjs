import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const cwd = process.cwd();
const outputDir = path.join(cwd, ".preview-fix");
fs.mkdirSync(outputDir, { recursive: true });

const stdoutLog = fs.createWriteStream(path.join(outputDir, "dev-server.out.log"), { flags: "w" });
const stderrLog = fs.createWriteStream(path.join(outputDir, "dev-server.err.log"), { flags: "w" });

const devServer = spawn("npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3001"], {
  cwd,
  shell: true,
  env: { ...process.env },
});

devServer.stdout.on("data", (chunk) => stdoutLog.write(chunk));
devServer.stderr.on("data", (chunk) => stderrLog.write(chunk));

const baseUrl = "http://127.0.0.1:3001";

async function waitForServer(timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/login`, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) return;
    } catch {}
    await delay(1000);
  }
  throw new Error("Timed out waiting for dev server");
}

async function shot(page, name) {
  await delay(800);
  await page.screenshot({ path: path.join(outputDir, name), fullPage: false });
}

let exitCode = 0;
try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await shot(page, "01-login.png");

  await page.fill("#email", "admin@ubuntutax.co.za");
  await page.fill("#password", "ChangeMe123!");
  await Promise.all([
    page.waitForURL("**/dashboard", { timeout: 60000 }),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
  await shot(page, "02-dashboard.png");

  await page.goto(`${baseUrl}/individual-tax`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("h1, h2, h3").first().scrollIntoViewIfNeeded();
  await shot(page, "03-individual-tax-list.png");

  await page.goto(`${baseUrl}/individual-tax/itax_001`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("h1, h2, h3").first().scrollIntoViewIfNeeded();
  await shot(page, "04-individual-tax-detail.png");

  await page.goto(`${baseUrl}/reports/individual-tax/itax_001/print`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await shot(page, "05-individual-tax-print.png");

  await browser.close();
} catch (err) {
  exitCode = 1;
  console.error(err);
} finally {
  devServer.kill();
  stdoutLog.end();
  stderrLog.end();
  await delay(1000);
}
process.exit(exitCode);
