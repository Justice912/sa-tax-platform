import "@testing-library/jest-dom/vitest";

// jsdom has no layout engine and no ResizeObserver. @tanstack/react-virtual (and any future
// ResizeObserver consumer) needs the constructor to exist even though jsdom never fires it --
// tests that need real measurements stub getBoundingClientRect/clientHeight/scrollHeight
// directly (see src/test/virtualization-test-utils.tsx) rather than relying on this no-op firing.
if (!globalThis.ResizeObserver) {
  class ResizeObserverPolyfill {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver;
}

