import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock @playwright/test so no real browser is launched during unit tests.
// The vi.mock call is hoisted to the top of the module by Vitest, so the
// import below reflects the mock at load time.
// ---------------------------------------------------------------------------

vi.mock("@playwright/test", () => ({
  chromium: {
    launch: vi.fn(),
  },
}));

import { chromium } from "@playwright/test";
import { BrowserPool } from "@/lib/browser-pool";

// ---------------------------------------------------------------------------
// Factory helpers for mock objects
// ---------------------------------------------------------------------------

type MockPage = {
  goto: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  isClosed: ReturnType<typeof vi.fn>;
};

type MockBrowser = {
  isConnected: ReturnType<typeof vi.fn>;
  newPage: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  _disconnectHandler: (() => void) | null;
};

function makeMockPage(): MockPage {
  return {
    goto: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    isClosed: vi.fn().mockReturnValue(false),
  };
}

function makeMockBrowser(pages: MockPage[]): MockBrowser {
  let pageIndex = 0;
  const browser: MockBrowser = {
    isConnected: vi.fn().mockReturnValue(true),
    newPage: vi.fn().mockImplementation(() => {
      const page = pages[pageIndex++] ?? makeMockPage();
      return Promise.resolve(page);
    }),
    close: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockImplementation((event: string, handler: () => void) => {
      if (event === "disconnected") {
        browser._disconnectHandler = handler;
      }
    }),
    _disconnectHandler: null,
  };
  return browser;
}

// ---------------------------------------------------------------------------
// Per-test state
// ---------------------------------------------------------------------------

let mockBrowser: MockBrowser;
let mockPages: MockPage[];

beforeEach(() => {
  mockPages = [makeMockPage(), makeMockPage(), makeMockPage(), makeMockPage()];
  mockBrowser = makeMockBrowser(mockPages);
  vi.mocked(chromium.launch).mockResolvedValue(
    mockBrowser as unknown as Awaited<ReturnType<typeof chromium.launch>>,
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BrowserPool — page acquisition", () => {
  it("launches the browser on first acquire", async () => {
    const pool = new BrowserPool({ maxPages: 2, pageTimeout: 5000 });
    await pool.acquire();
    expect(chromium.launch).toHaveBeenCalledOnce();
  });

  it("does not launch a second browser on subsequent acquires", async () => {
    const pool = new BrowserPool({ maxPages: 2, pageTimeout: 5000 });
    const p1 = await pool.acquire();
    await pool.release(p1);
    await pool.acquire();
    expect(chromium.launch).toHaveBeenCalledOnce();
  });

  it("creates pages up to maxPages then queues further requests", async () => {
    const pool = new BrowserPool({ maxPages: 2, pageTimeout: 5000 });

    const p1 = await pool.acquire();
    const p2 = await pool.acquire();

    expect(pool.stats.busy).toBe(2);
    expect(pool.stats.available).toBe(0);

    // Third acquire must wait — yield one microtask so the pool's Promise
    // constructor body runs and registers the waiting resolver before we check.
    const thirdAcquire = pool.acquire();
    await Promise.resolve();
    expect(pool.stats.waiting).toBe(1);

    await pool.release(p1);
    const p3 = await thirdAcquire;

    expect(p3).toBeDefined();
    expect(pool.stats.waiting).toBe(0);

    await pool.release(p2);
    await pool.release(p3);
  });

  it("reuses a page after it is released back to the pool", async () => {
    const pool = new BrowserPool({ maxPages: 2, pageTimeout: 5000 });

    const p1 = await pool.acquire();
    await pool.release(p1);

    expect(pool.stats.available).toBe(1);

    const p2 = await pool.acquire();

    // Only one page should have been created — the second acquire reuses p1
    expect(mockBrowser.newPage).toHaveBeenCalledOnce();
    // The recycled page receives a goto("about:blank") to reset its state
    expect(mockPages[0]!.goto).toHaveBeenCalledWith("about:blank", { timeout: 5000 });

    await pool.release(p2);
  });

  it("serves a waiting resolver immediately when a page is released", async () => {
    const pool = new BrowserPool({ maxPages: 1, pageTimeout: 5000 });

    const first = await pool.acquire();
    const secondPromise = pool.acquire(); // queued
    await Promise.resolve(); // let the pool's Promise constructor register the resolver
    expect(pool.stats.waiting).toBe(1);

    await pool.release(first);
    const second = await secondPromise;

    expect(second).toBeDefined();
    expect(pool.stats.waiting).toBe(0);
    await pool.release(second);
  });

  it("rejects with a timeout error when all pages stay busy past the deadline", async () => {
    const pool = new BrowserPool({ maxPages: 1, pageTimeout: 50 }); // 50 ms

    await pool.acquire(); // pool is now exhausted — intentionally not released

    await expect(pool.acquire()).rejects.toThrow(
      "Browser pool timeout: no pages available",
    );
  });
});

describe("BrowserPool — browser disconnect handling", () => {
  it("clears available and busy pages on disconnect", async () => {
    const pool = new BrowserPool({ maxPages: 2, pageTimeout: 5000 });

    const p1 = await pool.acquire();
    await pool.release(p1); // p1 moves to available

    expect(pool.stats.available).toBe(1);
    expect(pool.stats.browserConnected).toBe(true);

    // Simulate browser crash via the registered event handler
    mockBrowser._disconnectHandler?.();

    expect(pool.stats.available).toBe(0);
    expect(pool.stats.busy).toBe(0);
    expect(pool.stats.browserConnected).toBe(false);
  });

  it("re-launches the browser after a disconnect on the next acquire", async () => {
    const pool = new BrowserPool({ maxPages: 1, pageTimeout: 5000 });

    const p1 = await pool.acquire();
    await pool.release(p1);

    // Simulate crash
    mockBrowser._disconnectHandler?.();

    // Prepare a second browser for the re-launch
    const secondPages = [makeMockPage()];
    const secondBrowser = makeMockBrowser(secondPages);
    vi.mocked(chromium.launch).mockResolvedValueOnce(
      secondBrowser as unknown as Awaited<ReturnType<typeof chromium.launch>>,
    );

    const p2 = await pool.acquire();
    expect(p2).toBeDefined();
    // launch should have been called twice: original + re-launch after disconnect
    expect(chromium.launch).toHaveBeenCalledTimes(2);
    await pool.release(p2);
  });
});

describe("BrowserPool — broken page recovery", () => {
  it("replaces a broken available page with a fresh one on acquire", async () => {
    const pool = new BrowserPool({ maxPages: 2, pageTimeout: 5000 });

    const p1 = await pool.acquire();
    await pool.release(p1);

    // Make the recycled page's goto fail to simulate a crashed tab
    mockPages[0]!.goto.mockRejectedValueOnce(new Error("page crashed"));

    const recovered = await pool.acquire();
    // A second page should have been opened to replace the broken one
    expect(mockBrowser.newPage).toHaveBeenCalledTimes(2);
    expect(recovered).toBe(mockPages[1]);

    await pool.release(recovered);
  });
});

describe("BrowserPool — shutdown", () => {
  it("closes all pages and the browser on shutdown", async () => {
    const pool = new BrowserPool({ maxPages: 2, pageTimeout: 5000 });

    const p1 = await pool.acquire();
    const p2 = await pool.acquire();
    await pool.release(p1); // p1 → available, p2 still busy

    await pool.shutdown();

    expect(mockPages[0]!.close).toHaveBeenCalled();
    expect(mockPages[1]!.close).toHaveBeenCalled();
    expect(mockBrowser.close).toHaveBeenCalled();
    expect(pool.stats.available).toBe(0);
    expect(pool.stats.busy).toBe(0);

    void p2; // referenced to satisfy linter — it was in busyPages at shutdown
  });
});

describe("BrowserPool — stats", () => {
  it("accurately tracks available, busy, waiting, and maxPages", async () => {
    const pool = new BrowserPool({ maxPages: 3, pageTimeout: 5000 });

    expect(pool.stats.maxPages).toBe(3);
    expect(pool.stats.available).toBe(0);
    expect(pool.stats.busy).toBe(0);

    const p1 = await pool.acquire();
    expect(pool.stats.busy).toBe(1);
    expect(pool.stats.available).toBe(0);

    await pool.release(p1);
    expect(pool.stats.busy).toBe(0);
    expect(pool.stats.available).toBe(1);
  });

  it("reports browserConnected as false before any acquire", () => {
    const pool = new BrowserPool({ maxPages: 2, pageTimeout: 5000 });
    expect(pool.stats.browserConnected).toBe(false);
  });
});

describe("BrowserPool — acquire/release contract", () => {
  it("pool is empty again after full acquire-then-release cycle", async () => {
    const pool = new BrowserPool({ maxPages: 3, pageTimeout: 5000 });

    const pages = await Promise.all([pool.acquire(), pool.acquire(), pool.acquire()]);
    expect(pool.stats.busy).toBe(3);
    expect(pool.stats.available).toBe(0);

    for (const p of pages) {
      await pool.release(p);
    }

    expect(pool.stats.busy).toBe(0);
    expect(pool.stats.available).toBe(3);
  });

  it("releases the page even when the consumer throws", async () => {
    const pool = new BrowserPool({ maxPages: 1, pageTimeout: 5000 });
    const page = await pool.acquire();

    let threw = false;
    try {
      throw new Error("render failure");
    } catch {
      threw = true;
    } finally {
      await pool.release(page);
    }

    expect(threw).toBe(true);
    expect(pool.stats.busy).toBe(0);
    expect(pool.stats.available).toBe(1);
  });
});
