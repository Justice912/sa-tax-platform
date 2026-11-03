---
name: deceased-estate-liquidation
description: Run a complete South African deceased estate (solvent, s18(3), s34 insolvent, redistribution) end to end through the TaxOps ZA app API — intake, document requests and upload links, Master and SARS steps, Reg 5 L&D account, estate duty, submission packs.
---

# Deceased estate liquidation (TaxOps ZA)

Drive a South African deceased estate from report to discharge through the TaxOps ZA app
(`https://sa-tax-platform.vercel.app`, repo `Justice912/sa-tax-platform`). The app holds the
registers, document requests, secure upload links, the SARS tracker and the Reg 5 L&D engine.
This skill does the thinking: classify the estate, gather and read documents, post the data,
resolve engine checks and prepare the Master and SARS packs.

Everything produced is a **draft for practitioner review**. Never submit to SARS or the Master,
email creditors, or pay anything on the user's behalf. Prepare it and hand over.

## 1. Connect

1. Ask for (or read from env) `TAXOPS_URL` and `TAXOPS_API_KEY`. Keys are created in the app
   under **Admin > API keys** (`txo_<prefix>_<secret>`, shown once). Never echo the key back.
2. Get the client (Python stdlib only):
   - from a clone: `skills/deceased-estate-liquidation/scripts/taxops_estate.py`, or
   - `https://raw.githubusercontent.com/Justice912/sa-tax-platform/master/skills/deceased-estate-liquidation/scripts/taxops_estate.py`
   If neither is reachable, call the REST routes directly (list: `GET /api/v1/openapi`) with
   `Authorization: Bearer $TAXOPS_API_KEY`.
3. Smoke test: `python3 taxops_estate.py me`. On 401, the key is wrong or revoked. If the host
   can't be reached, say so plainly. The sandbox may block the domain, and the Supabase project
   may be paused.

Client commands: `python3 taxops_estate.py help`.

## 2. Classify before building

Ask only what the documents can't tell you. Decide:

| Question | Drives |
|---|---|
| Gross value < R250 000? | `SMALL_ESTATE_S18_3`: Letter of Authority (J170), J155 directions, no Master's fee, L&D optional but advisable |
| Liabilities > assets after the s29 claims period? | `INSOLVENT_S34`: s34 notices, encumbered-asset accounts, preference order |
| Otherwise | `SOLVENT`: full Reg 5 L&D |
| Will? | testate (award basis = will clause) or intestate (Intestate Succession Act 81/1987; heirs nominate executor) |
| Marital regime at death | in community → joint estate, spouse half; accrual → possible accrual claim (asset or liability) |
| Heirs redistributing? | `workpaper.redistribution` + signed agreement lodged with the account |

## 3. Procedure

Use the task list. One stage per item.

**Stage 1. Intake (REPORTED).** Build an intake plan and run `intake plan.json`:
```json
{
  "estate": {"deceasedName": "...", "idNumberOrPassport": "...", "dateOfBirth": "YYYY-MM-DD",
    "dateOfDeath": "YYYY-MM-DD", "maritalRegime": "IN_COMMUNITY|OUT_OF_COMMUNITY_ACCRUAL|OUT_OF_COMMUNITY_NO_ACCRUAL|CUSTOMARY|UNKNOWN",
    "taxNumber": "...", "hasWill": true, "executorName": "...",
    "executorCapacity": "EXECUTOR_TESTAMENTARY|EXECUTOR_DATIVE|ADMINISTRATOR",
    "executorEmail": "...", "executorPhone": "...", "assignedPractitionerName": "..."},
  "administration": {"administrationType": "SOLVENT", "masterOffice": "Durban",
    "workpaper": {"residentialAddress": "...", "maritalStatus": "NEVER_MARRIED", "hasAgent": true}},
  "beneficiaries": [{"key": "b1", "fullName": "...", "relationship": "Son", "isMinor": false,
    "sharePercentage": 50, "allocationType": "RESIDUARY"}],
  "assets": [{"category": "IMMOVABLE_PROPERTY", "description": "Erf 123 ... (as per title deed)",
    "dateOfDeathValue": 1500000, "isPrimaryResidence": true, "isPersonalUse": false,
    "spouseRollover": false, "beneficiaryKey": "b1"}],
  "liabilities": [{"creditorName": "FNB", "description": "Home loan", "amount": 250000,
    "securedByAssetDescription": "Erf 123 ... (as per title deed)"}]
}
```
Asset categories: IMMOVABLE_PROPERTY, VEHICLE, INVESTMENT, BANK_ACCOUNT, INSURANCE_POLICY,
RETIREMENT_FUND, BUSINESS_INTEREST, PERSONAL_EFFECTS, OTHER. Allocation types: RESIDUARY,
CASH_LEGACY, SPECIFIC_ASSET, INCOME_RIGHT, TRUST_ALLOCATION. Shares across beneficiaries may
not exceed 100%. Policies paid **directly to third parties** are not assets. They go in
`workpaper.estateDuty.deemedProperty`.

**Stage 2. Documents.** `init` seeds the standard requests: Master reporting (J294, death
certificate, IDs, will, J192, J243, J190/J262 or J155, J238/J170), the SARS estate case (executor
photo holding ID, POA, prior returns), L&D vouchers and finalisation items.
- `link ESTATE "Executor name" email 14` gives a secure upload URL. Give it to the user to send. You don't send it.
- For each upload: `download`, **read it**, extract the values, reconcile them to the registers
  (update assets/liabilities), then `review ... ACCEPTED` or `REJECTED "reason"`.
- Mark items that don't apply with `request-status ESTATE CODE WAIVED`.

**Stage 3. Master.** Report within 14 days of death. When letters are issued, run `admin` with
`masterReference` and `lettersOfExecutorshipDate`. The L&D falls due 6 months later (s35(1)).
Publish the s29 notice to creditors (Gazette J193 plus local newspaper, 30 days to 3 months).

**Stage 4. SARS** (tracker codes in brackets, update with `sars-set ESTATE CODE '{"status":"..."}'`):
1. Report the estate case (`REPORT_ESTATE_CASE`): "Request New Estate Case" online query, or pcc@sars.gov.za
   for practitioners. Use `pack ESTATE sars out.zip` for the attachments. Record `sarsCaseNumber`
   via `admin`. It goes in every file name and follow-up.
2. Deceased coded, executor linked as representative (`CODE_DECEASED_REPRESENTATIVE`). Activate
   on eFiling: SARS Registered Details > Activate Registered Representative.
3. ITR12 to date of death, including CGT on deemed disposal at death, para 40 (`PRE_DEATH_ITR12`).
   Put the CGT in `workpaper.capitalGainsTaxOnDeath`. Assessed tax becomes an L&D claim. Also
   VAT/PAYE/SDL/UIF if the deceased was registered for them.
4. Estate tax number if income or gains arise after death (`REGISTER_ESTATE_TAX_NUMBER`), then
   post-death returns until the L&D is approved or the estate is finalised (`POST_DEATH_RETURNS`).
5. REV267 with the L&D account (`REV267_ESTATE_DUTY_RETURN`). Duty is paid on eFiling:
   Additional Payments > Estate Duty (ESD) > Normal Payment, with the deceased's income tax
   reference. Proof goes to estateduty@sars.gov.za. It is due 12 months after death or as per
   the assessment, with s10 interest after that.
6. Refunds go into the estate account (REV16 for estate duty).
7. DEC letter (`DEC_LETTER`): request it only once everything is submitted, assessed and paid.
   It goes to the Master before distribution.

**Stage 5. Claims.** Add each proven s29 claim as a liability. For s34 estates, classify each
claim in `workpaper.claimOverlays[liabilityId]`: `claimClass` SECURED (+`securedAssetId`),
PREFERENT (+`preferenceRank`) or CONCURRENT. The suggested ranks under Insolvency Act ss96–102
are 1 funeral/death-bed, 2 administration, 3 execution, 4 employees, 5 statutory, 6 SARS,
7 general bond. **Verify each rank and any statutory cap against the Act.**

**Stage 6. Workpaper → L&D.** PUT `administration` with `workpaper`:
```json
{"accountKind": "FIRST_AND_FINAL", "testate": true,
 "assetOverlays": {"<assetId>": {"voucher": "1", "isCash": true, "disposal": "AWARD|SELL|CASH", "realisedValue": 0}},
 "claimOverlays": {"<liabilityId>": {"voucher": "18"}},
 "beneficiaryOverlays": {"<beneficiaryId>": {"willClause": "paragraph 4", "maritalNote": "not married",
   "dateOfBirth": "YYYY-MM-DD", "isSurvivingSpouse": false, "cashLegacyAmount": 0, "subjectToCondition": false}},
 "costs": [{"description": "Advertisement for debtors and creditors – Gazette", "amount": 26.6, "voucher": "9", "group": "ADMIN"},
           {"description": "Advertisement for this account", "amount": 664.56, "group": "ADVANCE"},
           {"description": "Stationery & postage", "amount": 150, "group": "ADMIN", "apportion": true}],
 "income": [{"description": "Interest on estate account", "amount": 1200}],
 "expenses": [{"description": "Bank charges", "amount": 350}],
 "incomePeriod": {"from": "YYYY-MM-DD", "to": "YYYY-MM-DD"},
 "redistribution": {"agreementDate": "YYYY-MM-DD", "assignments": [{"assetId": "...", "beneficiaryId": "..."}]},
 "estateDuty": {"deemedProperty": [{"description": "Policy paid to X", "amount": 520000, "category": "INSURANCE_POLICY"}],
   "section4hDeductions": 0, "abatement": 3500000},
 "capitalGainsTaxOnDeath": 0,
 "fees": {"executorFeeOverride": 55000, "masterFeeOverride": 7000, "executorVatRate": 0}}
```
Workpaper keys are merged at the top level, so always send the full value of any key you change.
Section C holds administration costs (adverts, postage, valuations, bond of security, funeral,
transfer and bond-cancellation costs) and section E holds advances. For s34, `assetId` ties a
cost to one encumbered asset, and `apportion: true` spreads it by value.

Then `ld ESTATE`. **Clear every `error` check.** Explain every `warning` to the user. Typical errors:
DISTRIBUTION_DIFFERENCE, RESIDUE_NEGATIVE (cash contribution or redistribution needed),
INSOLVENT (switch to s34), S18_3_THRESHOLD, SPOUSE_MISSING. Download the Word file with
`ld-docx ESTATE out.docx`.

**Stage 7. Lodge and finalise.** `pack ESTATE master out.zip`: the L&D, accepted documents and
a manifest of what is still outstanding. After the Master approves: s35 advert (21 days for
inspection, Gazette plus newspaper), s35(6) magistrate certificate, pay estate duty, get the DEC
letter, distribute, then collect receipts and acquittances (unclaimed money goes to the
Guardian's Fund within 2 months). Advance stages with `stage ESTATE`.

## 4. Rules the engine applies (check them, don't re-derive them)

- Executor's fee: 3.5% of gross assets (excluding policies paid to third parties) plus 6% of income collected after death (in the I&E). VAT is added only if the executor is a VAT vendor. "As agreed" overrides are allowed.
- Master's fee (course-notes tariff): nil below R250 000 or for s18(3); R600 up to R400 000; plus R200 per completed R100 000 above that; capped at R7 000. Verify against the current Regulations.
- Estate duty: gross (property + deemed property) − s4 deductions − s4(q) spouse − s4(h) PBO = net; minus the s4A rebate (R3.5m plus any ported unused spouse rebate) = dutiable. Rate is 20% up to R30m and 25% above. Duty is iterated because it reduces the residue and so changes s4(q).
- In community: the spouse is awarded half of (assets − joint debts); the deceased's half bears costs, fees and taxes; duty is on half the joint assets. **Review this against the will and the practice's Annexure 7 approach.**
- Reg 5 format: heading (account type, testate/intestate, ID, marital status, address, date of death, Master's ref), Liquidation A–F, Recapitulation, I&E, Distribution (major/minor, minors' date of birth, will clause or redistribution basis), Executor's certificate.
- s34: encumbered-asset accounts and the free residue, general costs apportioned by value, secured creditors from their asset, shortfall becomes concurrent, preferent creditors by rank, concurrent creditors pro rata.

## 5. Reporting back

End each session with: the estate reference, the stage, SARS tracker statuses, outstanding
documents, L&D errors and warnings, the next three actions with their due dates, and the files
produced (send them). Flag anything you assumed. Remind the user that SARS and Master
requirements change, and that figures from the course notes (Master's fee tariff, insolvency
ranks) need verifying before lodging.
