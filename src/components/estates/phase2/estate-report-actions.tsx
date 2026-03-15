"use client";

import { useMemo, useState } from "react";
import type {
  EstateStoredFilingPackArtifact,
  EstateStoredFilingPackBundle,
  EstateStoredFilingPackManifest,
} from "@/modules/estates/forms/types";

type EstateReportActionKind = "generate" | "download" | "open" | "print";

type EstateReportActionButton = {
  kind: EstateReportActionKind;
  label: string;
  tone?: "primary" | "secondary";
};

type EstateReportActionsProps = {
  estateId: string;
  taxYear: number;
  artifactCode?: string;
  renderFormat?: "pdf" | "docx" | "json";
  bundle?: "zip";
  resourceLabel: string;
  actions: EstateReportActionButton[];
};

type StoredReportResource =
  | (EstateStoredFilingPackArtifact & { fileName: string })
  | EstateStoredFilingPackBundle;

function buildButtonClass(tone: "primary" | "secondary" = "secondary") {
  return tone === "primary"
    ? "rounded-md bg-[#0E2433] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#12344a] disabled:cursor-not-allowed disabled:opacity-60"
    : "rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-60";
}

function buildQueryString({
  taxYear,
  artifactCode,
  renderFormat,
  bundle,
  download,
}: {
  taxYear: number;
  artifactCode?: string;
  renderFormat?: "pdf" | "docx" | "json";
  bundle?: "zip";
  download?: boolean;
}) {
  const params = new URLSearchParams({
    taxYear: String(taxYear),
  });

  if (artifactCode) {
    params.set("artifactCode", artifactCode);
  }

  if (renderFormat) {
    params.set("renderFormat", renderFormat);
  }

  if (bundle) {
    params.set("bundle", bundle);
  }

  if (download) {
    params.set("download", "1");
  }

  return params.toString();
}

async function requestReportResource(
  estateId: string,
  params: {
    taxYear: number;
    artifactCode?: string;
    renderFormat?: "pdf" | "docx" | "json";
    bundle?: "zip";
  },
) {
  const response = await fetch(
    `/api/reports/estates/${estateId}/filing-pack?${buildQueryString(params)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  const body = (await response.json()) as Partial<EstateStoredFilingPackManifest> & {
    error?: string;
    detail?: string;
  };

  if (!response.ok) {
    throw new Error(body.detail ?? body.error ?? "Failed to generate estate report.");
  }

  if (params.bundle) {
    if (!body.bundle) {
      throw new Error("The filing-pack ZIP did not return a file.");
    }

    return body.bundle as StoredReportResource;
  }

  const artifact = body.artifacts?.[0];
  if (!artifact) {
    throw new Error("The requested estate report did not return a file.");
  }

  return artifact as StoredReportResource;
}

function triggerBrowserDownload(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.rel = "noopener noreferrer";
  anchor.click();
}

export function EstateReportActions({
  estateId,
  taxYear,
  artifactCode,
  renderFormat,
  bundle,
  resourceLabel,
  actions,
}: EstateReportActionsProps) {
  const [pendingAction, setPendingAction] = useState<EstateReportActionKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const requestParams = useMemo(
    () => ({
      taxYear,
      artifactCode,
      renderFormat,
      bundle,
    }),
    [artifactCode, bundle, renderFormat, taxYear],
  );
  const binaryDownloadUrl = useMemo(
    () =>
      `/api/reports/estates/${estateId}/filing-pack?${buildQueryString({
        ...requestParams,
        download: true,
      })}`,
    [estateId, requestParams],
  );

  async function runAction(kind: EstateReportActionKind) {
    setPendingAction(kind);
    setMessage(null);

    try {
      const resource = await requestReportResource(estateId, requestParams);
      const desktopBridge = window.taxOpsDesktop;

      if (kind === "generate") {
        setMessage(`${resourceLabel} generated.`);
        return;
      }

      if (kind === "download") {
        if (desktopBridge) {
          const result = await desktopBridge.saveFileAs(resource.localFilePath, resource.fileName);
          setMessage(
            result.cancelled ? `${resourceLabel} download was cancelled.` : `${resourceLabel} saved.`,
          );
          return;
        }

        triggerBrowserDownload(binaryDownloadUrl);
        setMessage(`${resourceLabel} download started.`);
        return;
      }

      if (kind === "open") {
        if (desktopBridge) {
          await desktopBridge.openFile(resource.localFilePath);
          setMessage(`${resourceLabel} opened.`);
          return;
        }

        window.open(binaryDownloadUrl, "_blank", "noopener,noreferrer");
        setMessage(`${resourceLabel} opened in a new window.`);
        return;
      }

      if (!desktopBridge) {
        throw new Error("Print is available in the desktop app only.");
      }

      await desktopBridge.printFile(resource.localFilePath);
      setMessage(`${resourceLabel} sent to the print handler.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to complete report action.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action) => (
        <button
          key={action.kind}
          type="button"
          onClick={() => void runAction(action.kind)}
          disabled={pendingAction !== null}
          className={buildButtonClass(action.tone)}
        >
          {action.label}
        </button>
      ))}
      {message ? <p className="basis-full text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
