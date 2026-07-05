"use client";

/**
 * Headless-virtualized, month-filterable trip table over LogbookTripRecord[].
 *
 * Purely presentational: no server actions, no deemed/actual cost math. It owns its own
 * month filter + derived (filtered/sorted) list so the container that composes this table
 * stays thin. Uses @tanstack/react-virtual so the DOM only ever holds a bounded window of
 * row nodes regardless of dataset size (PERF-02), and a React.memo'd row component so an
 * edit that swaps a single trip object only re-renders that one row, not the whole visible
 * window (PERF-03 edit-responsiveness).
 *
 * Renders the REAL domain shape (`LogbookTripRecord`: businessKm direct + optional odometer
 * readings) -- there is no tripType/mixedSplit/privateKm concept here (06-RESEARCH.md Pitfall 1).
 */

import React, { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { LogbookTripRecord } from "@/modules/logbook/types";
import { fmtKm, MONTHS, selectCls } from "@/components/individual-tax/tax-tools/shared";

const ROW_HEIGHT = 40;
const SCROLL_HEIGHT = 480;

/** Grid template shared by the header row and every TripRow so columns stay aligned. */
const ROW_GRID_COLS =
  "grid grid-cols-[90px_1fr_100px_150px_1fr_80px] items-center gap-2 px-3";

/**
 * Pure filter + sort derivation, extracted so tests can measure its throughput directly
 * (mirrors the existing memo at travel-logbook-tab.tsx:257-269).
 */
export function filterAndSortTrips(
  trips: LogbookTripRecord[],
  filterMonth: string,
): LogbookTripRecord[] {
  return trips
    .filter(
      (t) =>
        filterMonth === "all" ||
        new Date(t.date).getMonth() === parseInt(filterMonth, 10),
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export interface TripRowProps {
  trip: LogbookTripRecord;
  onEdit: (trip: LogbookTripRecord) => void;
  onDelete: (tripId: string) => void;
  busy?: boolean;
}

/**
 * A single trip row. React.memo'd so that, given a stable `trip` object reference and
 * stable `onEdit`/`onDelete` callback identities, an edit that replaces one trip in the
 * parent's array re-renders ONLY that row -- unchanged sibling rows skip re-render.
 */
export const TripRow = React.memo(function TripRow({
  trip,
  onEdit,
  onDelete,
  busy,
}: TripRowProps) {
  const routeLabel =
    trip.fromLocation && trip.toLocation
      ? `${trip.fromLocation} → ${trip.toLocation}`
      : trip.fromLocation || trip.toLocation || "—";

  const odometerLabel =
    trip.odometerStart != null && trip.odometerEnd != null
      ? `${trip.odometerStart} → ${trip.odometerEnd}`
      : "—";

  return (
    <div
      className={`${ROW_GRID_COLS} h-10 border-b border-slate-100 text-xs hover:bg-slate-50`}
    >
      <span className="whitespace-nowrap font-mono">{trip.date}</span>
      <span className="truncate">{routeLabel}</span>
      <span className="text-right font-mono text-teal-600">
        {fmtKm(trip.businessKm)}
      </span>
      <span className="whitespace-nowrap font-mono text-slate-500">
        {odometerLabel}
      </span>
      <span
        className="max-w-[160px] truncate text-slate-500"
        title={trip.reason}
      >
        {trip.reason || "—"}
      </span>
      <span className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => onEdit(trip)}
          disabled={busy}
          className="text-slate-400 hover:text-teal-600 disabled:opacity-40"
          title="Edit"
        >
          &#9998;
        </button>
        <button
          type="button"
          onClick={() => onDelete(trip.id)}
          disabled={busy}
          className="text-slate-400 hover:text-red-500 disabled:opacity-40"
          title="Delete"
        >
          &times;
        </button>
      </span>
    </div>
  );
});
TripRow.displayName = "TripRow";

export interface TripTableProps {
  trips: LogbookTripRecord[];
  onEditTrip: (trip: LogbookTripRecord) => void;
  onDeleteTrip: (tripId: string) => void;
  busy?: boolean;
}

export function TripTable({
  trips,
  onEditTrip,
  onDeleteTrip,
  busy,
}: TripTableProps) {
  const [filterMonth, setFilterMonth] = useState("all");
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredTrips = useMemo(
    () => filterAndSortTrips(trips, filterMonth),
    [trips, filterMonth],
  );

  const virtualizer = useVirtualizer({
    count: filteredTrips.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    useFlushSync: false,
  });

  const totalBusinessKm = useMemo(
    () => filteredTrips.reduce((sum, t) => sum + t.businessKm, 0),
    [filteredTrips],
  );

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3">
        <h3 className="text-sm font-semibold text-slate-900">Trip Log</h3>
        <div className="w-40">
          <select
            className={selectCls}
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            aria-label="Filter by month"
          >
            <option value="all">All Months</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className={`${ROW_GRID_COLS} border-b border-slate-200 py-2 text-xs uppercase text-slate-500`}
      >
        <span>Date</span>
        <span>Route</span>
        <span className="text-right">Business KM</span>
        <span>Odometer</span>
        <span>Reason</span>
        <span className="text-right">Actions</span>
      </div>

      {filteredTrips.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          No trips yet.
        </div>
      ) : (
        <div
          ref={parentRef}
          style={{ height: SCROLL_HEIGHT, overflowY: "auto" }}
          className="relative"
        >
          <div
            style={{ height: virtualizer.getTotalSize(), position: "relative" }}
          >
            {virtualizer.getVirtualItems().map((vRow) => {
              const trip = filteredTrips[vRow.index];
              return (
                <div
                  key={trip.id}
                  data-virtual-row
                  data-index={vRow.index}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: vRow.size,
                    transform: `translateY(${vRow.start}px)`,
                  }}
                >
                  <TripRow
                    trip={trip}
                    onEdit={onEditTrip}
                    onDelete={onDeleteTrip}
                    busy={busy}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-teal-700">
        <span>TOTALS</span>
        <span className="font-mono text-teal-600">
          {fmtKm(totalBusinessKm)}
        </span>
      </div>
    </div>
  );
}
