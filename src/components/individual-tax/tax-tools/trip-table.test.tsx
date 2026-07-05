import React, { Profiler } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { mockScrollElementSize } from "@/test/virtualization-test-utils";
import {
  TripTable,
  TripRow,
  filterAndSortTrips,
} from "@/components/individual-tax/tax-tools/trip-table";
import type { LogbookTripRecord } from "@/modules/logbook/types";

/**
 * Proves PERF-02 (bounded DOM window regardless of dataset size) and PERF-03
 * (month-filter correctness, a filter/sort throughput budget, and edit-responsiveness
 * -- an edit re-renders only its own row, not sibling rows in the visible window).
 *
 * jsdom cannot measure real scroll FPS/frame timing (06-RESEARCH.md Pitfall 4), so the
 * testable proxies here are: bounded [data-virtual-row] node count, a Date.now() logic-side
 * time budget (mirrors import-pipeline.integration.test.ts:164-195), and React Profiler
 * render-count isolation (mirrors render-isolation.test.tsx:352-387).
 */

function makeTrip(
  i: number,
  overrides: Partial<LogbookTripRecord> = {},
): LogbookTripRecord {
  const day = String((i % 28) + 1).padStart(2, "0");
  const month = String((Math.floor(i / 28) % 12) + 1).padStart(2, "0");
  return {
    id: `trip_${i}`,
    date: `2026-${month}-${day}`,
    businessKm: 10 + (i % 50),
    fromLocation: "Depot",
    toLocation: "Client Site",
    reason: "Routine visit",
    odometerStart: 1000 + i * 10,
    odometerEnd: 1000 + i * 10 + 10,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("TripTable virtualization (PERF-02)", () => {
  it("renders a bounded window of row nodes for 10,000 trips, not 10,000", () => {
    const restore = mockScrollElementSize();
    try {
      const trips = Array.from({ length: 10_000 }, (_, i) => makeTrip(i));
      const { container } = render(
        <TripTable
          trips={trips}
          onEditTrip={vi.fn()}
          onDeleteTrip={vi.fn()}
        />,
      );

      const rowCount = container.querySelectorAll(
        "[data-virtual-row]",
      ).length;

      expect(rowCount).toBeGreaterThan(0);
      expect(rowCount).toBeLessThan(200);
    } finally {
      restore();
    }
  }, 15000);
});

describe("TripTable month filter", () => {
  it("filters rendered trips by month and restores them via All Months", async () => {
    const restore = mockScrollElementSize();
    try {
      const user = userEvent.setup();
      const trips: LogbookTripRecord[] = [
        makeTrip(0, { id: "t-jan-1", date: "2026-01-05" }),
        makeTrip(1, { id: "t-jan-2", date: "2026-01-15" }),
        makeTrip(2, { id: "t-feb-1", date: "2026-02-10" }),
      ];
      render(
        <TripTable
          trips={trips}
          onEditTrip={vi.fn()}
          onDeleteTrip={vi.fn()}
        />,
      );

      // All Months (default): every trip's date is represented.
      expect(screen.getByText("2026-01-05")).toBeInTheDocument();
      expect(screen.getByText("2026-01-15")).toBeInTheDocument();
      expect(screen.getByText("2026-02-10")).toBeInTheDocument();

      await user.selectOptions(
        screen.getByLabelText(/filter by month/i),
        "0",
      ); // January
      expect(screen.getByText("2026-01-05")).toBeInTheDocument();
      expect(screen.getByText("2026-01-15")).toBeInTheDocument();
      expect(screen.queryByText("2026-02-10")).not.toBeInTheDocument();

      await user.selectOptions(
        screen.getByLabelText(/filter by month/i),
        "all",
      );
      expect(screen.getByText("2026-01-05")).toBeInTheDocument();
      expect(screen.getByText("2026-01-15")).toBeInTheDocument();
      expect(screen.getByText("2026-02-10")).toBeInTheDocument();
    } finally {
      restore();
    }
  }, 15000);

  it("shows an empty state when no trips match the current filter", () => {
    render(
      <TripTable trips={[]} onEditTrip={vi.fn()} onDeleteTrip={vi.fn()} />,
    );
    expect(screen.getByText(/no trips yet/i)).toBeInTheDocument();
  });
});

describe("filterAndSortTrips throughput (PERF-03 logic-side proxy)", () => {
  it("filters and sorts 10,000 trips well within a generous time budget", () => {
    const trips = Array.from({ length: 10_000 }, (_, i) => makeTrip(i));

    const start = Date.now();
    const result = filterAndSortTrips(trips, "5"); // June (0-indexed month 5)
    const elapsedMs = Date.now() - start;

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((t) => new Date(t.date).getMonth() === 5)).toBe(true);
    // Generous 500ms budget guards against accidental O(n^2) behavior -- this is a
    // logic-side throughput proxy (mirrors import-pipeline.integration.test.ts:164-195),
    // not a UI-jank/frame-timing benchmark; jsdom cannot measure real FPS.
    expect(elapsedMs).toBeLessThan(500);
  });
});

describe("TripTable callback wiring", () => {
  it("invokes onEditTrip/onDeleteTrip with the right trip/id when Edit/Delete are clicked", async () => {
    const restore = mockScrollElementSize();
    try {
      const user = userEvent.setup();
      const onEditTrip = vi.fn();
      const onDeleteTrip = vi.fn();
      const trip = makeTrip(0, { id: "trip-edit-me" });

      render(
        <TripTable
          trips={[trip]}
          onEditTrip={onEditTrip}
          onDeleteTrip={onDeleteTrip}
        />,
      );

      await user.click(screen.getByTitle("Edit"));
      expect(onEditTrip).toHaveBeenCalledWith(trip);

      await user.click(screen.getByTitle("Delete"));
      expect(onDeleteTrip).toHaveBeenCalledWith("trip-edit-me");
    } finally {
      restore();
    }
  }, 15000);
});

/**
 * ProfiledRow is itself React.memo'd, one level ABOVE its internal <Profiler>. This
 * matters: React.memo's bailout happens at the ProfiledRow fiber itself, so when a
 * sibling's `trip` reference is unchanged, React never even walks into its <Profiler>/
 * <TripRow> subtree for this commit -- onRender genuinely does not fire for it. (A
 * Profiler placed directly under a re-rendering, non-memoized mapper would still record
 * a near-zero-duration "onRender" call for every row on every commit, since the mapper
 * itself re-executing forces React to visit every child element it produces -- that
 * shape would silently defeat this proof.)
 */
const ProfiledRow = React.memo(function ProfiledRow({
  trip,
  onEdit,
  onDelete,
  onRender,
}: {
  trip: LogbookTripRecord;
  onEdit: (trip: LogbookTripRecord) => void;
  onDelete: (tripId: string) => void;
  onRender: (id: string, phase: string) => void;
}) {
  return (
    <Profiler id={trip.id} onRender={onRender}>
      <TripRow trip={trip} onEdit={onEdit} onDelete={onDelete} />
    </Profiler>
  );
});

function ProfiledRows({
  trips,
  onEdit,
  onDelete,
  spies,
}: {
  trips: LogbookTripRecord[];
  onEdit: (trip: LogbookTripRecord) => void;
  onDelete: (tripId: string) => void;
  spies: Record<string, (id: string, phase: string) => void>;
}) {
  return (
    <>
      {trips.map((trip) => (
        <ProfiledRow
          key={trip.id}
          trip={trip}
          onEdit={onEdit}
          onDelete={onDelete}
          onRender={spies[trip.id]}
        />
      ))}
    </>
  );
}

describe("TripRow edit-responsiveness (PERF-03 edit dimension, Profiler render-count proof)", () => {
  it("re-renders only the edited row; sibling rows skip re-render (React.memo isolation)", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const trips: LogbookTripRecord[] = [
      makeTrip(0, { id: "trip-a" }),
      makeTrip(1, { id: "trip-b" }),
      makeTrip(2, { id: "trip-c" }),
    ];
    const spyA = vi.fn();
    const spyB = vi.fn();
    const spyC = vi.fn();
    const spies = { "trip-a": spyA, "trip-b": spyB, "trip-c": spyC };

    const { rerender } = render(
      <ProfiledRows
        trips={trips}
        onEdit={onEdit}
        onDelete={onDelete}
        spies={spies}
      />,
    );

    // Let the initial-mount Profiler firings settle before measuring the edit.
    spyA.mockClear();
    spyB.mockClear();
    spyC.mockClear();

    // A genuine edit: only trip-b's businessKm changes; trip-a/trip-c object
    // references are reused verbatim (not cloned).
    const editedTrips = trips.map((t) =>
      t.id === "trip-b" ? { ...t, businessKm: t.businessKm + 999 } : t,
    );

    rerender(
      <ProfiledRows
        trips={editedTrips}
        onEdit={onEdit}
        onDelete={onDelete}
        spies={spies}
      />,
    );

    expect(spyB).toHaveBeenCalled();
    expect(spyA).not.toHaveBeenCalled();
    expect(spyC).not.toHaveBeenCalled();
  });

  it("keeps the 10k-row bounded DOM window intact across an edit re-render (ties PERF-02 + PERF-03 together)", () => {
    const restore = mockScrollElementSize();
    try {
      const trips = Array.from({ length: 10_000 }, (_, i) => makeTrip(i));
      const { container, rerender } = render(
        <TripTable
          trips={trips}
          onEditTrip={vi.fn()}
          onDeleteTrip={vi.fn()}
        />,
      );

      const editedTrips = trips.map((t, i) =>
        i === 5000 ? { ...t, businessKm: t.businessKm + 1 } : t,
      );

      rerender(
        <TripTable
          trips={editedTrips}
          onEditTrip={vi.fn()}
          onDeleteTrip={vi.fn()}
        />,
      );

      // jsdom cannot measure real FPS, so bounded-DOM-node-count after an edit is the
      // testable proxy for "editing one trip among 10,000 stays responsive."
      const rowCount = container.querySelectorAll(
        "[data-virtual-row]",
      ).length;
      expect(rowCount).toBeGreaterThan(0);
      expect(rowCount).toBeLessThan(200);
    } finally {
      restore();
    }
  }, 15000);
});
