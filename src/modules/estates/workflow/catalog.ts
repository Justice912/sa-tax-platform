/**
 * Standard document requests and SARS obligations for a South African deceased
 * estate. Sources: Master's reporting requirements and the SARS "Administration
 * of Deceased Estates" guide / FAQ "What supporting documents must I submit to
 * report a new Estate Case?" and the practice's L&D course notes.
 * Requirements change — review the catalogue against current SARS/Master guidance.
 */

export type DocumentAudience = "MASTER" | "SARS" | "LD_VOUCHER" | "INTERNAL";
export type AdministrationType = "SOLVENT" | "INSOLVENT_S34" | "SMALL_ESTATE_S18_3";

export interface CatalogContext {
  administrationType: AdministrationType;
  testate: boolean;
  married: boolean;
  hasImmovableProperty: boolean;
  hasAgent: boolean;
}

export interface DocumentCatalogItem {
  code: string;
  title: string;
  description: string;
  audience: DocumentAudience;
  /** Short code used in SARS-ready file names. */
  sarsCode?: string;
  /** Default party asked for the document. */
  requestedFrom: "EXECUTOR" | "FAMILY" | "PRACTICE" | "CREDITOR" | "INSTITUTION";
  when?: (ctx: CatalogContext) => boolean;
}

const notS183 = (c: CatalogContext) => c.administrationType !== "SMALL_ESTATE_S18_3";
const isS183 = (c: CatalogContext) => c.administrationType === "SMALL_ESTATE_S18_3";
const insolvent = (c: CatalogContext) => c.administrationType === "INSOLVENT_S34";
const needsLd = (c: CatalogContext) => c.administrationType !== "SMALL_ESTATE_S18_3";

export const DOCUMENT_CATALOG: DocumentCatalogItem[] = [
  // Reporting the estate to the Master (within 14 days of death)
  { code: "J294_DEATH_NOTICE", title: "Death notice (J294)", description: "Completed death notice form.", audience: "MASTER", sarsCode: "J294", requestedFrom: "FAMILY" },
  { code: "DEATH_CERTIFICATE", title: "Death certificate", description: "Original or certified copy (DHA). Abridged or unabridged.", audience: "MASTER", sarsCode: "DEATHCERT", requestedFrom: "FAMILY" },
  { code: "DECEASED_ID", title: "Certified ID of the deceased", description: "Certified copy of the deceased's ID document.", audience: "MASTER", sarsCode: "ID_DECEASED", requestedFrom: "FAMILY" },
  { code: "MARRIAGE_PROOF", title: "Marriage certificate / proof of marriage", description: "Marriage certificate, antenuptial contract (if any) and declaration of marriage by the surviving spouse.", audience: "MASTER", requestedFrom: "FAMILY", when: (c) => c.married },
  { code: "WILL_AND_CODICILS", title: "Original will and codicils", description: "All original wills, codicils or documents purporting to be such.", audience: "MASTER", sarsCode: "WILL", requestedFrom: "FAMILY", when: (c) => c.testate },
  { code: "J192_NEXT_OF_KIN", title: "Next-of-kin affidavit (J192)", description: "Completed next-of-kin affidavit.", audience: "MASTER", requestedFrom: "FAMILY" },
  { code: "J243_INVENTORY", title: "Inventory (J243)", description: "Inventory of all assets with proof of values.", audience: "MASTER", sarsCode: "J243", requestedFrom: "PRACTICE" },
  { code: "CREDITOR_LIST", title: "List of creditors", description: "Known creditors of the deceased with account numbers and balances.", audience: "MASTER", requestedFrom: "FAMILY" },
  { code: "EXECUTOR_NOMINATION", title: "Nomination of executor by heirs", description: "Required for intestate estates or where no executor was nominated in the will.", audience: "MASTER", requestedFrom: "FAMILY", when: (c) => !c.testate },
  { code: "NOT_PREVIOUSLY_REPORTED", title: "Declaration: estate not reported at another Master", description: "Declaration that the estate was not previously reported at any other Master's office.", audience: "MASTER", requestedFrom: "FAMILY" },
  { code: "J190_ACCEPTANCE_OF_TRUST", title: "Acceptance of trust as executor (J190)", description: "In duplicate, with certified copy of executor's ID photo page.", audience: "MASTER", sarsCode: "J190", requestedFrom: "EXECUTOR", when: notS183 },
  { code: "J262_BOND_OF_SECURITY", title: "Undertaking and bond of security (J262)", description: "Unless exempted in the will or executor is parent, spouse or child.", audience: "MASTER", requestedFrom: "EXECUTOR", when: notS183 },
  { code: "J155_MASTERS_DIRECTIONS", title: "Acceptance of Master's directions (J155)", description: "Signed by the person nominated by the beneficiaries (s18(3) estates).", audience: "MASTER", sarsCode: "J155", requestedFrom: "EXECUTOR", when: isS183 },
  { code: "EXECUTOR_ID", title: "Certified ID of executor / Master's representative", description: "Certified copy of the photo page.", audience: "MASTER", sarsCode: "ID_EXECUTOR", requestedFrom: "EXECUTOR" },
  { code: "J238_LETTERS_OF_EXECUTORSHIP", title: "Letters of executorship (J238)", description: "Issued by the Master.", audience: "MASTER", sarsCode: "J238", requestedFrom: "PRACTICE", when: notS183 },
  { code: "J170_LETTER_OF_AUTHORITY", title: "Letter of authority (J170)", description: "Issued by the Master for section 18(3) estates.", audience: "MASTER", sarsCode: "J170", requestedFrom: "PRACTICE", when: isS183 },

  // SARS estate case (Request New Estate Case)
  { code: "SARS_EXECUTOR_SELFIE_ID", title: "Photo of executor holding ID", description: "Face and proof of identity clearly visible in the same picture (SARS estate-case requirement).", audience: "SARS", sarsCode: "SELFIE_ID", requestedFrom: "EXECUTOR" },
  { code: "SARS_POWER_OF_ATTORNEY", title: "Power of attorney to agent + certified agent ID", description: "Where the executor appointed the practice as agent.", audience: "SARS", sarsCode: "POA", requestedFrom: "EXECUTOR", when: (c) => c.hasAgent },
  { code: "SARS_PRIOR_RETURNS", title: "Tax returns / assessments for the last 5 years", description: "Plus eFiling login details if known, IRP5s and certificates for the final year.", audience: "SARS", requestedFrom: "FAMILY" },

  // Vouchers for the L&D account
  { code: "BANK_STATEMENTS_DOD", title: "Bank statements at date of death", description: "All accounts, showing balance at date of death and post-death interest.", audience: "LD_VOUCHER", requestedFrom: "INSTITUTION" },
  { code: "TITLE_DEED_VALUATION", title: "Title deed and sworn valuation", description: "Title deed description and sworn appraisal / municipal valuation of immovable property.", audience: "LD_VOUCHER", requestedFrom: "FAMILY", when: (c) => c.hasImmovableProperty },
  { code: "BOND_STATEMENT", title: "Bond statement / settlement figure", description: "Mortgage balance and bond cancellation figures.", audience: "LD_VOUCHER", requestedFrom: "INSTITUTION", when: (c) => c.hasImmovableProperty },
  { code: "RATES_CLEARANCE", title: "Rates clearance figures and certificate", description: "Municipal rates clearance for transfer.", audience: "LD_VOUCHER", requestedFrom: "PRACTICE", when: (c) => c.hasImmovableProperty },
  { code: "VEHICLE_REGISTRATION", title: "Vehicle registration papers and valuation", description: "Registration certificate and trade/retail valuation.", audience: "LD_VOUCHER", requestedFrom: "FAMILY" },
  { code: "POLICY_DOCUMENTS", title: "Life policies and beneficiary nominations", description: "Policies payable to the estate and to third parties (deemed property s3(3)).", audience: "LD_VOUCHER", requestedFrom: "INSTITUTION" },
  { code: "INVESTMENT_STATEMENTS", title: "Investment, share and unit-trust statements", description: "Values at date of death; unlisted share valuations need SARS approval.", audience: "LD_VOUCHER", requestedFrom: "INSTITUTION" },
  { code: "RETIREMENT_FUND_LETTERS", title: "Pension / retirement fund letters", description: "Including non-deductible contributions (property for estate duty).", audience: "LD_VOUCHER", requestedFrom: "INSTITUTION" },
  { code: "FUNERAL_INVOICE", title: "Funeral, tombstone and death-bed invoices", description: "Section 4(a) Estate Duty Act deductions.", audience: "LD_VOUCHER", requestedFrom: "FAMILY" },
  { code: "CREDITOR_CLAIMS", title: "Creditors' written claims", description: "Claims lodged in response to the s29 notice (affidavits for disputed claims).", audience: "LD_VOUCHER", requestedFrom: "CREDITOR" },
  { code: "S29_ADVERT_PROOF", title: "s29 notice to creditors — Gazette and newspaper", description: "Proof and invoices of the notice to debtors and creditors (J193).", audience: "LD_VOUCHER", requestedFrom: "PRACTICE", when: needsLd },
  { code: "ESTATE_BANK_ACCOUNT", title: "Estate late bank account statements", description: "All receipts and payments through the estate bank account.", audience: "LD_VOUCHER", requestedFrom: "PRACTICE", when: needsLd },
  { code: "REDISTRIBUTION_AGREEMENT", title: "Signed redistribution agreement", description: "Must accompany the L&D account when heirs redistribute (reg 5(1)(e)(iii)).", audience: "LD_VOUCHER", requestedFrom: "FAMILY", when: needsLd },

  // Insolvent estates (s34)
  { code: "S34_CREDITOR_NOTICE", title: "s34(1) notice to creditors (copy to Master)", description: "Report of insolvency; at least 14 days for creditors to instruct surrender.", audience: "MASTER", requestedFrom: "PRACTICE", when: insolvent },
  { code: "S34_SALE_NOTICE", title: "s34(2) notice of intended sale", description: "Manner and conditions of sale; at least 14 days' notice.", audience: "MASTER", requestedFrom: "PRACTICE", when: insolvent },
  { code: "SECURED_CREDITOR_VALUATION", title: "Secured creditors' valuation of security", description: "s34(1)(b) — value placed on security when called upon.", audience: "LD_VOUCHER", requestedFrom: "CREDITOR", when: insolvent },

  // Finalisation
  { code: "S35_ADVERT_PROOF", title: "s35 advertisement — account open for inspection", description: "Gazette and newspaper (21 days).", audience: "MASTER", requestedFrom: "PRACTICE", when: needsLd },
  { code: "S35_6_MAGISTRATE_CERTIFICATE", title: "Magistrate's s35(6) certificate", description: "Confirms no objections were lodged at the magistrate's office.", audience: "MASTER", requestedFrom: "PRACTICE", when: needsLd },
  { code: "SARS_DEC_LETTER", title: "SARS Deceased Estate Compliance (DEC) letter", description: "Issued only once all taxes, including estate duty, are paid. Submit to the Master.", audience: "SARS", sarsCode: "DEC", requestedFrom: "PRACTICE" },
  { code: "HEIR_ACQUITTANCES", title: "Receipts and acquittances from heirs and creditors", description: "Lodged with the Master after distribution.", audience: "MASTER", requestedFrom: "FAMILY", when: needsLd },
];

export function documentCatalogFor(ctx: CatalogContext) {
  return DOCUMENT_CATALOG.filter((item) => !item.when || item.when(ctx));
}

export interface SarsObligationCatalogItem {
  code: string;
  title: string;
  taxType: string;
  guidance: string;
  defaultNotApplicable?: boolean;
}

export const SARS_OBLIGATION_CATALOG: SarsObligationCatalogItem[] = [
  {
    code: "REPORT_ESTATE_CASE",
    title: "Report the estate case to SARS",
    taxType: "ALL",
    guidance:
      "Use 'Request New Estate Case' (SARS online query) or email pcc@sars.gov.za (practitioners). Attach the estate-case pack. Record the SARS case number and quote it on every follow-up and upload.",
  },
  {
    code: "CODE_DECEASED_REPRESENTATIVE",
    title: "Deceased coded and executor linked as representative taxpayer",
    taxType: "ALL",
    guidance: "After coding, activate the representative on eFiling: SARS Registered Details > Activate Registered Representative.",
  },
  {
    code: "PRE_DEATH_ITR12",
    title: "Income tax returns up to date of death (ITR12)",
    taxType: "ITR12",
    guidance: "Submit all outstanding returns, including 1 March to date of death. Include CGT on deemed disposal at death (para 40, Eighth Schedule). Assessments become claims in the L&D account.",
  },
  {
    code: "PRE_DEATH_OTHER_TAXES",
    title: "VAT / PAYE / SDL / UIF up to date of death",
    taxType: "VAT/PAYE",
    guidance: "Only if the deceased was registered for these tax types. These are self-assessed.",
    defaultNotApplicable: true,
  },
  {
    code: "REGISTER_ESTATE_TAX_NUMBER",
    title: "Register the deceased estate as a separate taxpayer",
    taxType: "ITR12",
    guidance: "Required when income (interest, rent) or capital gains arise after death. The estate receives its own income tax reference.",
  },
  {
    code: "POST_DEATH_RETURNS",
    title: "Post-death returns for the deceased estate",
    taxType: "ITR12",
    guidance: "Submit for each year from the day after death until the L&D account is approved / the estate is finalised and deregistered.",
  },
  {
    code: "REV267_ESTATE_DUTY_RETURN",
    title: "Estate duty return (REV267)",
    taxType: "ESTATE_DUTY",
    guidance: "Submit with the L&D account to the Master and SARS. Commissioner must approve unlisted share valuations.",
  },
  {
    code: "ESTATE_DUTY_PAYMENT",
    title: "Estate duty assessment and payment",
    taxType: "ESTATE_DUTY",
    guidance:
      "eFiling: Additional Payments > Create Additional Payment > Tax type 'Estate Duty (ESD)' > 'Estate Duty Normal Payment', reference = deceased's income tax number. Email proof to estateduty@sars.gov.za. Due 12 months after death or as per the assessment; s10 interest thereafter.",
  },
  {
    code: "REFUNDS_TO_ESTATE_ACCOUNT",
    title: "SARS refunds paid into the estate bank account",
    taxType: "ALL",
    guidance: "Refunds must be paid before finalisation. Estate duty refunds use form REV16.",
  },
  {
    code: "DEC_LETTER",
    title: "Deceased Estate Compliance (DEC) letter",
    taxType: "ALL",
    guidance: "Request only when all returns are submitted, assessed and paid (including estate duty). Approx. 21 business days. Submit to the Master before distribution / discharge.",
  },
];

export function sarsDocumentFileName(params: {
  caseNumber?: string;
  idNumber?: string;
  sarsCode?: string;
  fallbackCode: string;
  originalFileName: string;
}) {
  const ext = params.originalFileName.includes(".") ? params.originalFileName.split(".").pop()!.toLowerCase() : "pdf";
  const safe = (v: string) => v.replace(/[^A-Za-z0-9-]+/g, "").toUpperCase();
  const parts = [params.caseNumber ? safe(params.caseNumber) : "NOCASE", params.idNumber ? safe(params.idNumber) : undefined, safe(params.sarsCode ?? params.fallbackCode)].filter(Boolean);
  return `${parts.join("_")}.${ext}`;
}
