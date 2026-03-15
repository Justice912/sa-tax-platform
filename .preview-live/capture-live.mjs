import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { setTimeout as delay } from "node:timers/promises";

const cwd = process.cwd();
const outputDir = path.join(cwd, ".preview-live");
fs.mkdirSync(outputDir, { recursive: true });
const baseUrl = "http://127.0.0.1:3000";

async function waitForServer(timeoutMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/login`, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) return;
    } catch {}
    await delay(1000);
  }
  throw new Error("Timed out waiting for existing dev server on :3000");
}

(async () => {
  await waitForServer();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await delay(800);
  await page.screenshot({ path: path.join(outputDir, "01-login.png"), fullPage: false });

  await page.fill("#email", "admin@ubuntutax.co.za");
  await page.fill("#password", "ChangeMe123!");
  await Promise.all([
    page.waitForURL("**/dashboard", { timeout: 60000 }),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
  await delay(800);
  await page.screenshot({ path: path.join(outputDir, "02-dashboard.png"), fullPage: false });

  await page.goto(`${baseUrl}/individual-tax`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("h1, h2, h3").first().scrollIntoViewIfNeeded();
  await delay(800);
  await page.screenshot({ path: path.join(outputDir, "03-individual-tax-list.png"), fullPage: false });

  await page.goto(`${baseUrl}/individual-tax/itax_001`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("h1, h2, h3").first().scrollIntoViewIfNeeded();
  await delay(800);
  await page.screenshot({ path: path.join(outputDir, "04-individual-tax-detail.png"), fullPage: false });

  await page.goto(`${baseUrl}/reports/individual-tax/itax_001/print`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await delay(800);
  await page.screenshot({ path: path.join(outputDir, "05-individual-tax-print.png"), fullPage: false });

  await browser.close();
})();
