/**
 * Reusable jsdom virtualization test recipe (Phase 6 plans 06-02/06-03 reuse this verbatim).
 *
 * jsdom has no layout engine: every element reports 0 for clientHeight/scrollHeight and an
 * all-zero getBoundingClientRect. @tanstack/react-virtual's useVirtualizer relies on the scroll
 * container's measured size to compute which rows are "in view" -- without a non-zero viewport
 * it renders either 0 rows or (depending on version/options) falls back to rendering everything.
 * mockScrollElementSize stubs just enough of HTMLElement's layout surface, scoped to the
 * duration of a single test via the returned restore function, so it never perturbs unrelated
 * component tests (per plan: do NOT globally override getBoundingClientRect in setup.ts).
 */

type RestoreFn = () => void;

export function mockScrollElementSize(height = 480, itemHeight = 40): RestoreFn {
  const width = 800;
  // Generous scrollable content height so scroll-margin math (scrollHeight - clientHeight)
  // never goes negative for a 10k+ row virtual list.
  const totalContentHeight = height * 50;

  // IMPORTANT: @tanstack/react-virtual's initial viewport measurement (observeElementRect's
  // getRect(), virtual-core/dist/esm/index.js) reads element.offsetWidth/offsetHeight -- NOT
  // getBoundingClientRect(). jsdom has no layout engine so both are always 0 by default, and
  // jsdom's ResizeObserver never actually fires (there is no layout pass to trigger it), so a
  // real ResizeObserver callback will never arrive to supply a size after the fact either.
  // Stubbing offsetWidth/offsetHeight is therefore the load-bearing part of this recipe;
  // getBoundingClientRect/clientHeight/scrollHeight are stubbed too for any other consumer
  // (future non-TanStack virtualization, layout-reading component under test) that reads those
  // instead.
  const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
  const offsetWidthDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "offsetWidth",
  );
  const offsetHeightDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "offsetHeight",
  );
  const clientHeightDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "clientHeight",
  );
  const clientWidthDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "clientWidth",
  );
  const scrollHeightDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "scrollHeight",
  );
  const scrollWidthDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "scrollWidth",
  );

  HTMLElement.prototype.getBoundingClientRect = function boundingClientRectStub() {
    return {
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON() {
        return this;
      },
    } as DOMRect;
  };

  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() {
      return width;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get() {
      return height;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get() {
      return height;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      return width;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get() {
      return totalContentHeight;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get() {
      return width;
    },
  });

  return function restore() {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    if (offsetWidthDescriptor) {
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", offsetWidthDescriptor);
    }
    if (offsetHeightDescriptor) {
      Object.defineProperty(HTMLElement.prototype, "offsetHeight", offsetHeightDescriptor);
    }
    if (clientHeightDescriptor) {
      Object.defineProperty(HTMLElement.prototype, "clientHeight", clientHeightDescriptor);
    }
    if (clientWidthDescriptor) {
      Object.defineProperty(HTMLElement.prototype, "clientWidth", clientWidthDescriptor);
    }
    if (scrollHeightDescriptor) {
      Object.defineProperty(HTMLElement.prototype, "scrollHeight", scrollHeightDescriptor);
    }
    if (scrollWidthDescriptor) {
      Object.defineProperty(HTMLElement.prototype, "scrollWidth", scrollWidthDescriptor);
    }
    void itemHeight; // reserved for future per-row-height assertions; kept in signature per plan spec
  };
}
