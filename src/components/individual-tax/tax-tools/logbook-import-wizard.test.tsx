import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockScrollElementSize } from "@/test/virtualization-test-utils";
import type { ParsedImportData } from "@/modules/logbook/import/types";
import type { ImportPreviewLogbookInput } from "@/modules/logbook/import/validate-import";

// Only parseImportFile is mocked -- it crosses the Web Worker boundary jsdom cannot provide.
// detectSarsElogbookLayout / applyColumnMapping / buildImportPreview stay REAL so these tests
// genuinely exercise the wizard's wiring to the actual Phase 4 pipeline (per plan).
vi.mock("@/modules/logbook/import/import-file", () => ({
  parseImportFile: vi.fn(),
}));

import { parseImportFile } from "@/modules/logbook/import/import-file";
import { LogbookImportWizard } from "@/components/individual-tax/tax-tools/logbook-import-wizard";

const SARS_HEADERS = [
  "Date",
  "Total Business Km",
  "From",
  "To",
  "Reason",
  "*Opening Km",
  "*Closing Km",
];

function sarsRow(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    Date: "2026-01-05",
    "Total Business Km": "120",
    From: "Office",
    To: "Client Site",
    Reason: "Client meeting",
    "*Opening Km": "1000",
    "*Closing Km": "1120",
    ...overrides,
  };
}

function makeFile(name: string): File {
  return new File(["irrelevant -- parseImportFile is mocked"], name, { type: "text/csv" });
}

const emptyLogbook: ImportPreviewLogbookInput = {
  openingOdometer: 0,
  closingOdometer: null,
  existingTrips: [],
};

beforeEach(() => {
  vi.mocked(parseImportFile).mockReset();
});

describe("LogbookImportWizard", () => {
  it(
    "auto-detects the SARS eLogbook layout, previews valid trips, and commits only valid trips with source CSV",
    async () => {
      const user = userEvent.setup();
      const parsed: ParsedImportData = {
        headers: SARS_HEADERS,
        rows: [sarsRow(), sarsRow({ Date: "2026-01-06", "Total Business Km": "80" })],
        errors: [],
      };
      vi.mocked(parseImportFile).mockResolvedValue(parsed);
      const onCommit = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();

      render(
        <LogbookImportWizard logbook={emptyLogbook} onCommit={onCommit} onClose={onClose} />,
      );

      await user.upload(screen.getByLabelText(/select logbook file/i), makeFile("trips.csv"));

      await waitFor(() => {
        expect(screen.getByText(/sars elogbook detected/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/confidence: high/i)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /^next$/i }));

      await waitFor(() => {
        expect(screen.getByText(/^valid:\s*2$/i)).toBeInTheDocument();
      });

      const importButton = screen.getByRole("button", { name: /import 2 valid trips/i });
      expect(importButton).not.toBeDisabled();

      await user.click(importButton);

      await waitFor(() => expect(onCommit).toHaveBeenCalledTimes(1));
      const [validTrips, source] = onCommit.mock.calls[0];
      expect(source).toBe("CSV");
      expect(validTrips).toHaveLength(2);
      expect(onClose).toHaveBeenCalledTimes(1);
    },
    15000,
  );

  it(
    "falls back to manual mapping when the layout is not recognized, and blocks Next until the 5 mandatory fields are chosen",
    async () => {
      const user = userEvent.setup();
      const unknownHeaders = ["Col A", "Col B", "Col C", "Col D", "Col E"];
      const parsed: ParsedImportData = {
        headers: unknownHeaders,
        rows: [
          {
            "Col A": "2026-01-05",
            "Col B": "50",
            "Col C": "Home",
            "Col D": "Work",
            "Col E": "Commute",
          },
        ],
        errors: [],
      };
      vi.mocked(parseImportFile).mockResolvedValue(parsed);

      render(
        <LogbookImportWizard logbook={emptyLogbook} onCommit={vi.fn()} onClose={vi.fn()} />,
      );

      await user.upload(screen.getByLabelText(/select logbook file/i), makeFile("mystery.csv"));

      await waitFor(() => {
        expect(screen.getByText(/not recognized/i)).toBeInTheDocument();
      });

      const nextButton = screen.getByRole("button", { name: /^next$/i });
      expect(nextButton).toBeDisabled();

      await user.selectOptions(screen.getByLabelText(/^date\b/i), "Col A");
      await user.selectOptions(screen.getByLabelText(/^business km\b/i), "Col B");
      await user.selectOptions(screen.getByLabelText(/^from\b/i), "Col C");
      await user.selectOptions(screen.getByLabelText(/^to\b/i), "Col D");
      expect(nextButton).toBeDisabled();
      await user.selectOptions(screen.getByLabelText(/^reason\b/i), "Col E");

      expect(nextButton).not.toBeDisabled();
    },
    15000,
  );

  it(
    "surfaces an invalid row (unparseable date) in the preview and excludes it from onCommit",
    async () => {
      const user = userEvent.setup();
      const parsed: ParsedImportData = {
        headers: SARS_HEADERS,
        rows: [sarsRow(), sarsRow({ Date: "not-a-date" })],
        errors: [],
      };
      vi.mocked(parseImportFile).mockResolvedValue(parsed);
      const onCommit = vi.fn().mockResolvedValue(undefined);

      // The preview table is virtualized (@tanstack/react-virtual) -- it needs a mocked
      // non-zero viewport (06-01 recipe) to render any [data-virtual-row] content in jsdom at
      // all, since this assertion checks the actual rendered row error text.
      const restore = mockScrollElementSize();
      try {
        render(
          <LogbookImportWizard logbook={emptyLogbook} onCommit={onCommit} onClose={vi.fn()} />,
        );

        await user.upload(screen.getByLabelText(/select logbook file/i), makeFile("trips.csv"));
        await waitFor(() =>
          expect(screen.getByText(/sars elogbook detected/i)).toBeInTheDocument(),
        );
        await user.click(screen.getByRole("button", { name: /^next$/i }));

        await waitFor(() => {
          expect(screen.getByText(/^valid:\s*1$/i)).toBeInTheDocument();
          expect(screen.getByText(/^invalid:\s*1$/i)).toBeInTheDocument();
        });
        expect(screen.getByText(/unparseable or invalid date/i)).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: /import 1 valid trips/i }));
        await waitFor(() => expect(onCommit).toHaveBeenCalledTimes(1));
        expect(onCommit.mock.calls[0][0]).toHaveLength(1);
      } finally {
        restore();
      }
    },
    15000,
  );

  it(
    "renders a bounded virtualized DOM for a 5,000-row valid preview (PERF-02)",
    async () => {
      const user = userEvent.setup();
      // Odometer columns left blank so validateOdometerContinuity's cross-row discontinuity
      // check (which compares adjacent sorted odometer readings) has nothing to compare across
      // 5,000 identical-date rows -- keeps this test focused on the virtualization proof rather
      // than incidentally generating thousands of continuity warnings.
      const rows = Array.from({ length: 5000 }, (_, i) =>
        sarsRow({
          "Total Business Km": String(10 + (i % 50)),
          "*Opening Km": "",
          "*Closing Km": "",
        }),
      );
      const parsed: ParsedImportData = { headers: SARS_HEADERS, rows, errors: [] };
      vi.mocked(parseImportFile).mockResolvedValue(parsed);

      const restore = mockScrollElementSize();
      try {
        const { container } = render(
          <LogbookImportWizard logbook={emptyLogbook} onCommit={vi.fn()} onClose={vi.fn()} />,
        );

        await user.upload(screen.getByLabelText(/select logbook file/i), makeFile("big.csv"));
        await waitFor(() =>
          expect(screen.getByText(/sars elogbook detected/i)).toBeInTheDocument(),
        );
        await user.click(screen.getByRole("button", { name: /^next$/i }));

        await waitFor(() => expect(screen.getByText(/^valid:\s*5000$/i)).toBeInTheDocument());

        const rowCount = container.querySelectorAll("[data-virtual-row]").length;
        expect(rowCount).toBeGreaterThan(0);
        expect(rowCount).toBeLessThan(200);
      } finally {
        restore();
      }
    },
    15000,
  );
});
