import { useRef } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useVirtualizer } from "@tanstack/react-virtual";
import { mockScrollElementSize } from "@/test/virtualization-test-utils";

/**
 * Proves the reusable jsdom virtualization recipe (mockScrollElementSize + useVirtualizer)
 * before any real trip table depends on it (06-RESEARCH.md Open Q4 / Pitfall 4).
 *
 * Success shape: 10,000 items in, but the DOM only ever holds a bounded (<200) number of
 * `[data-virtual-row]` nodes -- proof that virtualization, not a full map(), is rendering.
 */

const ITEM_COUNT = 10_000;

function VirtualList() {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: ITEM_COUNT,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
    useFlushSync: false,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} style={{ height: 480, overflow: "auto" }} data-testid="scroll-container">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualItems.map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-virtual-row
            data-index={virtualRow.index}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            Row {virtualRow.index}
          </div>
        ))}
      </div>
    </div>
  );
}

describe("virtualization jsdom recipe", () => {
  it("renders a bounded number of DOM rows for a 10,000-item list", () => {
    const restore = mockScrollElementSize();

    try {
      const { container } = render(<VirtualList />);
      const rowCount = container.querySelectorAll("[data-virtual-row]").length;

      expect(rowCount).toBeGreaterThan(0);
      expect(rowCount).toBeLessThan(200);
    } finally {
      restore();
    }
  });
});
