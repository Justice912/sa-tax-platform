import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const cwd = process.cwd();
const outputDir = path.join(cwd, ".preview-latest");
fs.mkdirSync(outputDir, { recursive: true });

const stdoutLog = fs.createWriteStream(path.join(outputDir, "dev-server.out.log"), { flags: "w" });
const stderrLog = fs.createWriteStream(path.join(outputDir, "dev-server.err.log"), { flags: "w" });

const devServer = spawn("npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3000"], {
  cwd,
  shell: true,
  env: { ...process.env },
});

devServer.stdout.on("data", (chunk) => stdoutLog.write(chunk));
devServer.stderr.on("data", (chunk) => stderrLog.write(chunk));

const baseUrl = "http://127.0.0.1:3000";

async function waitForServer(timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/login`, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch {
      // no-op
    }
    await delay(1000);
  }
  throw new Error("Timed out waiting for dev server");
}

async function capture() {
  await waitForServer();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outputDir, "01-login.png"), fullPage: true });

  await page.fill("#email", "admin@ubuntutax.co.za");
  await page.fill("#password", "ChangeMe123!");
  await Promise.all([
    page.waitForURL("**/dashboard", { timeout: 30000 }),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(outputDir, "02-dashboard.png"), fullPage: true });

  await page.goto(`${baseUrl}/individual-tax`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outputDir, "03-individual-tax-list.png"), fullPage: true });

  await page.goto(`${baseUrl}/individual-tax/itax_001`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outputDir, "04-individual-tax-detail.png"), fullPage: true });

  await page.goto(`${baseUrl}/reports/individual-tax/itax_001/print`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outputDir, "05-individual-tax-print.png"), fullPage: true });

  const pdfResponse = await page.request.get(`${baseUrl}/api/reports/individual-tax/itax_001/pdf`);
  if (!pdfResponse.ok()) {
    throw new Error(`PDF endpoint failed with status ${pdfResponse.status()}`);
  }
  const pdfBuffer = await pdfResponse.body();
  fs.writeFileSync(path.join(outputDir, "individual-tax-report.pdf"), pdfBuffer);

  await browser.close();
}

let exitCode = 0;
try {
  await capture();
} catch (error) {
  exitCode = 1;
  console.error(error);
} finally {
  devServer.kill();
  stdoutLog.end();
  stderrLog.end();
  await delay(1200);
}

process.exit(exitCode);
