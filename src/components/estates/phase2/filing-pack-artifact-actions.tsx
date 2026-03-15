"use client";

import { EstateReportActions } from "@/components/estates/phase2/estate-report-actions";

type FilingPackArtifactActionsProps = {
  estateId: string;
  taxYear: number;
  artifactCode: string;
  artifactTitle: string;
  outputFormat: string;
};

function formatOutputLabel(outputFormat: string) {
  switch (outputFormat.toLowerCase()) {
    case "docx":
      return "Word";
    case "pdf":
      return "PDF";
    case "json":
      return "JSON";
    default:
      return outputFormat.toUpperCase();
  }
}

function supportsPrint(outputFormat: string) {
  const normalized = outputFormat.toLowerCase();
  return normalized === "pdf" || normalized === "docx";
}

export function FilingPackArtifactActions({
  estateId,
  taxYear,
  artifactCode,
  artifactTitle,
  outputFormat,
}: FilingPackArtifactActionsProps) {
  const formatLabel = formatOutputLabel(outputFormat);
  const actions: Array<{
    kind: "generate" | "download" | "open" | "print";
    label: string;
    tone?: "primary" | "secondary";
  }> = [
    { kind: "generate", label: `Generate ${formatLabel}` },
    { kind: "open", label: `Open ${formatLabel}` },
    { kind: "download", label: `Download ${formatLabel}` },
  ];

  if (supportsPrint(outputFormat)) {
    actions.push({ kind: "print", label: `Print ${formatLabel}`, tone: "primary" });
  }

  return (
    <EstateReportActions
      estateId={estateId}
      taxYear={taxYear}
      artifactCode={artifactCode}
      resourceLabel={artifactTitle}
      actions={actions}
    />
  );
}
