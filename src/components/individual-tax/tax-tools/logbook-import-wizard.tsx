"use client";

import { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Field, selectCls } from "@/components/individual-tax/tax-tools/shared";
import { parseImportFile } from "@/modules/logbook/import/import-file";
import { detectSarsElogbookLayout } from "@/modules/logbook/import/detect-elogbook";
import { applyColumnMapping } from "@/modules/logbook/import/column-mapping";
import {
  buildImportPreview,
  type ImportPreviewLogbookInput,
} from "@/modules/logbook/import/validate-import";
import type {
  ColumnMapping,
  DetectedMapping,
  ImportPreviewResult,
  ImportRowResult,
  ParsedImportData,
} from "@/modules/logbook/import/types";

/**
 * Self-contained import wizard driving the real Phase 4 pipeline end-to-end:
 * select -> parseImportFile -> detectSarsElogbookLayout (suggestion, never
 * auto-committed) -> confirm-or-manual column mapping -> applyColumnMapping ->
 * buildImportPreview -> commit only the valid trips via the parent-supplied
 * `onCommit`. This REPLACES the naive FileReader + split(",") path that used
 * to live in travel-logbook-tab.tsx.
 *
 * Parsing stays entirely client-side (parseImportFile is worker-backed for
 * both CSV and XLSX); only the final commit crosses a Server Action, which is
 * the parent's responsibility (research Pitfall 5) -- this component never
 * imports a server action itself.
 */
export interface LogbookImportWizardProps {
  /** Opening/closing odometer + existing trips of the target logbook, used for the
      cross-row odometer-continuity check inside buildImportPreview. */
  logbook: ImportPreviewLogbookInput;
  onCommit: (
    validTrips: ImportRowResult["trip"][],
    source: "CSV" | "XLSX",
  ) => Promise<void>;
  onClose: () => void;
}

type WizardStep = 0 | 1 | 2;

type MappingFormState = Record<keyof ColumnMapping, string>;

const EMPTY_MAPPING_FORM: MappingFormState = {
  date: "",
  businessKm: "",
  fromLocation: "",
  toLocation: "",
  reason: "",
  odometerStart: "",
  odometerEnd: "",
};

function mappingFormFromDetected(mapping: ColumnMapping): MappingFormState {
  return {
    date: mapping.date,
    businessKm: mapping.businessKm,
    fromLocation: mapping.fromLocation,
    toLocation: mapping.toLocation,
    reason: mapping.reason,
    odometerStart: mapping.odometerStart ?? "",
    odometerEnd: mapping.odometerEnd ?? "",
  };
}

/** The 5 fields that MUST be mapped before the preview step can run -- odometer
    readings stay optional per the official SARS eLogbook ("not compulsory"). */
const MANDATORY_MAPPING_KEYS: (keyof ColumnMapping)[] = [
  "date",
  "businessKm",
  "fromLocation",
  "toLocation",
  "reason",
];

const MAPPING_FIELDS: {
  key: keyof ColumnMapping;
  label: string;
  mandatory: boolean;
}[] = [
  { key: "date", label: "Date", mandatory: true },
  { key: "businessKm", label: "Business KM", mandatory: true },
  { key: "fromLocation", label: "From", mandatory: true },
  { key: "toLocation", label: "To", mandatory: true },
  { key: "reason", label: "Reason", mandatory: true },
  { key: "odometerStart", label: "Odometer Start", mandatory: false },
  { key: "odometerEnd", label: "Odometer End", mandatory: false },
];

const STEP_TITLES = ["Select file", "Map columns", "Preview & import"];

function deriveSource(fileName: string): "CSV" | "XLSX" {
  return fileName.trim().toLowerCase().endsWith(".xlsx") ? "XLSX" : "CSV";
}

export function LogbookImportWizard({
  logbook,
  onCommit,
  onClose,
}: LogbookImportWizardProps) {
  const [step, setStep] = useState<WizardStep>(0);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedImportData | null>(null);
  const [source, setSource] = useState<"CSV" | "XLSX" | null>(null);
  const [detected, setDetected] = useState<DetectedMapping | null>(null);
  const [mappingForm, setMappingForm] = useState<MappingFormState>(EMPTY_MAPPING_FORM);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const previewRows = preview?.rows ?? [];
  const virtualizer = useVirtualizer({
    count: previewRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
    useFlushSync: false,
  });

  const isMappingComplete = MANDATORY_MAPPING_KEYS.every(
    (key) => mappingForm[key] !== "",
  );
  const canCommit =
    !!preview && preview.validCount > 0 && preview.continuityErrors.length === 0;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsParsing(true);
    setParseError(null);
    try {
      const result = await parseImportFile(file);
      const fileSource = deriveSource(file.name);
      const detection = detectSarsElogbookLayout(result.headers);
      setParsed(result);
      setSource(fileSource);
      setDetected(detection);
      setMappingForm(
        detection ? mappingFormFromDetected(detection.mapping) : EMPTY_MAPPING_FORM,
      );
      setPreview(null);
      setStep(1);
    } catch (error) {
      setParseError(
        error instanceof Error ? error.message : "Failed to parse file.",
      );
    } finally {
      setIsParsing(false);
    }
  }

  function handleBuildPreview() {
    if (!parsed || !isMappingComplete) return;
    const columnMapping: ColumnMapping = {
      date: mappingForm.date,
      businessKm: mappingForm.businessKm,
      fromLocation: mappingForm.fromLocation,
      toLocation: mappingForm.toLocation,
      reason: mappingForm.reason,
      odometerStart: mappingForm.odometerStart || null,
      odometerEnd: mappingForm.odometerEnd || null,
    };
    const candidates = applyColumnMapping(parsed.rows, columnMapping);
    const result = buildImportPreview(candidates, logbook);
    setPreview(result);
    setStep(2);
  }

  async function handleCommit() {
    if (!preview || !source || !canCommit) return;
    setIsCommitting(true);
    setCommitError(null);
    try {
      const validTrips = preview.rows
        .filter((row) => row.status === "valid")
        .map((row) => row.trip);
      await onCommit(validTrips, source);
      onClose();
    } catch (error) {
      setCommitError(
        error instanceof Error ? error.message : "Failed to import trips.",
      );
    } finally {
      setIsCommitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Import logbook trips"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200/80 bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Import Trips — Step {step + 1} of 3: {STEP_TITLES[step]}
          </h2>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600"
            onClick={onClose}
            aria-label="Cancel import"
          >
            &times;
          </button>
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Select a CSV or XLSX logbook export (the official SARS eLogbook
              template is auto-detected). Files up to 10&nbsp;MB / 50,000 rows
              are accepted.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              aria-label="Select logbook file"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white hover:bg-[#12344a] disabled:opacity-50"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
            >
              {isParsing ? "Parsing…" : "Choose file"}
            </button>
            {parseError && (
              <p className="text-sm text-red-600" role="alert">
                {parseError}
              </p>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {step === 1 && parsed && (
          <div className="space-y-4">
            {detected ? (
              <p className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-700">
                SARS eLogbook detected (confidence: {detected.confidence}).
                Confirm or edit the column mapping below.
              </p>
            ) : (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Layout not recognized as the SARS eLogbook template. Map each
                column manually.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {MAPPING_FIELDS.map((field) => (
                <Field
                  key={field.key}
                  label={field.mandatory ? `${field.label} *` : field.label}
                >
                  <select
                    className={selectCls}
                    value={mappingForm[field.key]}
                    onChange={(event) =>
                      setMappingForm((prev) => ({
                        ...prev,
                        [field.key]: event.target.value,
                      }))
                    }
                  >
                    <option value="">— Select —</option>
                    {parsed.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600"
                onClick={() => setStep(0)}
              >
                Back
              </button>
              <button
                type="button"
                className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={handleBuildPreview}
                disabled={!isMappingComplete}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && preview && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="font-semibold text-teal-700">
                Valid: {preview.validCount}
              </span>
              <span className="font-semibold text-red-600">
                Invalid: {preview.invalidCount}
              </span>
            </div>
            {preview.continuityErrors.length > 0 && (
              <div className="space-y-1 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {preview.continuityErrors.map((warning) => (
                  <p key={warning.code}>{warning.message}</p>
                ))}
              </div>
            )}
            {preview.continuityWarnings.length > 0 && (
              <div className="space-y-1 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {preview.continuityWarnings.map((warning) => (
                  <p key={warning.code}>{warning.message}</p>
                ))}
              </div>
            )}
            <div
              ref={parentRef}
              style={{ height: 320, overflow: "auto" }}
              className="rounded-lg border border-slate-200"
            >
              <div
                style={{
                  height: virtualizer.getTotalSize(),
                  position: "relative",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = previewRows[virtualRow.index];
                  return (
                    <div
                      key={row.rowIndex}
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
                      className="flex items-center gap-3 border-b border-slate-100 px-3 text-xs"
                    >
                      <span
                        className={`w-14 shrink-0 rounded px-1.5 py-0.5 text-center font-semibold ${
                          row.status === "valid"
                            ? "bg-teal-100 text-teal-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {row.status === "valid" ? "Valid" : "Invalid"}
                      </span>
                      <span className="w-24 shrink-0 font-mono">
                        {row.trip?.date ?? "—"}
                      </span>
                      <span className="w-40 flex-1 truncate">
                        {row.trip
                          ? `${row.trip.fromLocation} → ${row.trip.toLocation}`
                          : "—"}
                      </span>
                      <span className="w-20 shrink-0 text-right font-mono">
                        {row.trip ? row.trip.businessKm : "—"}
                      </span>
                      <span className="flex-[2] truncate text-red-600">
                        {row.errors.join("; ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            {commitError && (
              <p className="text-sm text-red-600" role="alert">
                {commitError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600"
                onClick={() => setStep(1)}
                disabled={isCommitting}
              >
                Back
              </button>
              <button
                type="button"
                className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={handleCommit}
                disabled={!canCommit || isCommitting}
              >
                {isCommitting
                  ? "Importing…"
                  : `Import ${preview.validCount} valid trips`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
