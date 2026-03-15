import { chromium, type Browser, type Page } from "@playwright/test";

interface BrowserPoolConfig {
  maxPages: number;
  pageTimeout: number; // ms
}

class BrowserPool {
  private browser: Browser | null = null;
  private availablePages: Page[] = [];
  private busyPages: Set<Page> = new Set();
  private waitingResolvers: Array<(page: Page) => void> = [];
  private config: BrowserPoolConfig;
  private launching: Promise<Browser> | null = null;

  constructor(config?: Partial<BrowserPoolConfig>) {
    this.config = {
      maxPages:
        config?.maxPages ??
        parseInt(process.env.BROWSER_POOL_SIZE || "3", 10),
      pageTimeout: config?.pageTimeout ?? 30000,
    };
  }

  private async ensureBrowser(): Promise<Browser> {
    if (this.browser?.isConnected()) return this.browser;

    // Prevent multiple simultaneous launches
    if (this.launching) return this.launching;

    this.launching = chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    this.browser = await this.launching;
    this.launching = null;

    // Handle browser disconnect — clear all pool state so the next
    // acquire() call triggers a fresh launch.
    this.browser.on("disconnected", () => {
      this.browser = null;
      this.availablePages = [];
      this.busyPages.clear();
    });

    return this.browser;
  }

  async acquire(): Promise<Page> {
    const browser = await this.ensureBrowser();

    // Try to reuse an available page
    if (this.availablePages.length > 0) {
      const page = this.availablePages.pop()!;
      this.busyPages.add(page);
      try {
        await page.goto("about:blank", { timeout: 5000 });
      } catch {
        // Page is broken — discard it and open a fresh one
        try {
          await page.close();
        } catch {
          // ignore close errors
        }
        const newPage = await browser.newPage();
        this.busyPages.add(newPage);
        return newPage;
      }
      return page;
    }

    // Create a new page if the pool has capacity
    const totalPages = this.availablePages.length + this.busyPages.size;
    if (totalPages < this.config.maxPages) {
      const page = await browser.newPage();
      this.busyPages.add(page);
      return page;
    }

    // Pool is at capacity — wait for a page to be released
    return new Promise<Page>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waitingResolvers.indexOf(resolve);
        if (idx >= 0) this.waitingResolvers.splice(idx, 1);
        reject(new Error("Browser pool timeout: no pages available"));
      }, this.config.pageTimeout);

      this.waitingResolvers.push((page) => {
        clearTimeout(timer);
        resolve(page);
      });
    });
  }

  async release(page: Page): Promise<void> {
    this.busyPages.delete(page);

    // Serve any caller that is waiting before returning the page to the pool
    if (this.waitingResolvers.length > 0) {
      const resolver = this.waitingResolvers.shift()!;
      this.busyPages.add(page);
      try {
        await page.goto("about:blank", { timeout: 5000 });
        resolver(page);
      } catch {
        // Page is broken — discard it and open a fresh one for the waiter
        try {
          await page.close();
        } catch {
          // ignore close errors
        }
        const browser = await this.ensureBrowser();
        const newPage = await browser.newPage();
        this.busyPages.add(newPage);
        resolver(newPage);
      }
      return;
    }

    this.availablePages.push(page);
  }

  async shutdown(): Promise<void> {
    for (const page of [...this.availablePages, ...this.busyPages]) {
      try {
        await page.close();
      } catch {
        // ignore close errors during shutdown
      }
    }
    this.availablePages = [];
    this.busyPages.clear();
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  get stats() {
    return {
      available: this.availablePages.length,
      busy: this.busyPages.size,
      waiting: this.waitingResolvers.length,
      maxPages: this.config.maxPages,
      browserConnected: this.browser?.isConnected() ?? false,
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let poolInstance: BrowserPool | null = null;

export function getBrowserPool(): BrowserPool {
  if (!poolInstance) {
    poolInstance = new BrowserPool();
  }
  return poolInstance;
}

// ---------------------------------------------------------------------------
// Convenience helper — acquire, execute, release
// ---------------------------------------------------------------------------

export async function withPooledPage<T>(
  fn: (page: Page) => Promise<T>,
): Promise<T> {
  const pool = getBrowserPool();
  const page = await pool.acquire();
  try {
    return await fn(page);
  } finally {
    await pool.release(page);
  }
}

// ---------------------------------------------------------------------------
// Graceful shutdown on process exit
// ---------------------------------------------------------------------------

process.on("SIGTERM", () => {
  const pool = getBrowserPool();
  pool.shutdown().catch(() => {
    // best-effort — do not let shutdown errors surface after SIGTERM
  });
});

process.on("SIGINT", () => {
  const pool = getBrowserPool();
  pool.shutdown().catch(() => {
    // best-effort
  });
});

export { BrowserPool };
