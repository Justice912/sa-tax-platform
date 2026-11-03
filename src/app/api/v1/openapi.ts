/** Compact route catalogue served at GET /api/v1/openapi (consumed by the Claude skill). */
export function renderOpenApi() {
  const e = "/api/v1/estates/{estateId}";
  return {
    name: "TaxOps ZA Deceased Estates API",
    version: "1.0.0",
    auth: "Authorization: Bearer txo_<prefix>_<secret> (create under Admin > API keys)",
    routes: [
      ["GET", "/api/v1/me", "Who am I"],
      ["GET", "/api/v1/estates", "List estates"],
      ["POST", "/api/v1/estates", "Create estate (EstateCreateInput + optional administration{}); seeds document requests + SARS tracker"],
      ["GET", e, "Estate detail + administration"],
      ["POST", `${e}/workflow/init`, "Create/refresh administration, document requests, SARS obligations"],
      ["GET", `${e}/status`, "Workflow status, outstanding docs, SARS tracker, L&D checks, next actions"],
      ["PUT", `${e}/administration`, "Update administrationType, masterReference, lettersOfExecutorshipDate, sarsCaseNumber, tax refs, workpaper{}"],
      ["POST", `${e}/assets`, "Add asset (category, description, dateOfDeathValue, isPrimaryResidence, isPersonalUse, spouseRollover, beneficiaryId?)"],
      ["POST", `${e}/liabilities`, "Add liability (creditorName, description, amount, securedByAssetDescription?)"],
      ["POST", `${e}/beneficiaries`, "Add beneficiary (fullName, relationship, isMinor, sharePercentage, allocationType)"],
      ["GET", `${e}/document-requests`, "List document requests"],
      ["POST", `${e}/document-requests`, "Add custom request(s) {code,title,audience,description?}"],
      ["PATCH", `${e}/document-requests/{requestId}`, "Update status (WAIVED etc.)"],
      ["POST", `${e}/upload-links`, "Create secure upload link {recipientName, recipientEmail?, requestIds?, expiresInDays?} -> uploadUrl"],
      ["DELETE", `${e}/upload-links/{linkId}`, "Revoke upload link"],
      ["GET", `${e}/documents`, "List uploaded documents"],
      ["POST", `${e}/documents`, "Multipart upload (file, requestId?) — up to ~4 MB on Vercel"],
      ["POST", `${e}/documents/sign`, "Large upload step 1 {fileName,mimeType,fileSizeBytes,requestId?} -> signed URL"],
      ["POST", `${e}/documents/complete`, "Large upload step 2 {storageKey,fileName,mimeType,fileSizeBytes,requestId?}"],
      ["PATCH", `${e}/documents/{documentId}`, "Review {status: ACCEPTED|REJECTED, reviewNote?}"],
      ["GET", `${e}/documents/{documentId}/download`, "Download"],
      ["GET", `${e}/ld`, "Reg 5 L&D account JSON (?format=docx for Word, ?includeInput=1)"],
      ["GET", `${e}/sars-obligations`, "SARS tracker"],
      ["PATCH", `${e}/sars-obligations/{code}`, "Update {status, reference?, amount?, dueDate?, notes?}"],
      ["GET", `${e}/packs/sars`, "ZIP: SARS-named accepted docs + L&D + manifest"],
      ["GET", `${e}/packs/master`, "ZIP: Master lodgement pack"],
      ["POST", `${e}/stage`, "Advance estate stage (validated)"],
    ].map(([method, path, summary]) => ({ method, path, summary })),
  };
}
