import {
  PrismaClient,
  RoleCode,
  ClientType,
  ClientStatus,
  CaseStatus,
  CaseType,
  PriorityLevel,
  DocumentVisibility,
  ITR12WorkflowState,
  ITR12WorkpaperStatus,
  ITR12CalculationRunStatus,
  IndividualTaxAssessmentStatus,
  IndividualTaxLineSection,
  GeneratedReportType,
  EstateFormTemplateCode,
  EstateYearPackStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);

  await prisma.$transaction([
    prisma.reminder.deleteMany(),
    prisma.deadline.deleteMany(),
    prisma.caseActivity.deleteMany(),
    prisma.caseDocument.deleteMany(),
    prisma.caseKnowledgeArticle.deleteMany(),
    prisma.generatedReport.deleteMany(),
    prisma.estateEngineRun.deleteMany(),
    prisma.estateFormTemplate.deleteMany(),
    prisma.estateYearPack.deleteMany(),
    prisma.individualTaxNote.deleteMany(),
    prisma.individualTaxLineItem.deleteMany(),
    prisma.individualTaxAssessment.deleteMany(),
    prisma.individualTaxProfile.deleteMany(),
    prisma.individualTaxRuleVersion.deleteMany(),
    prisma.iTR12ReviewChecklist.deleteMany(),
    prisma.iTR12Assumption.deleteMany(),
    prisma.iTR12CalculationLineItem.deleteMany(),
    prisma.iTR12CalculationRun.deleteMany(),
    prisma.iTR12Workpaper.deleteMany(),
    prisma.iTR12Profile.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.task.deleteMany(),
    prisma.submission.deleteMany(),
    prisma.case.deleteMany(),
    prisma.document.deleteMany(),
    prisma.articleTag.deleteMany(),
    prisma.knowledgeBaseTag.deleteMany(),
    prisma.knowledgeBaseArticle.deleteMany(),
    prisma.clientProfile.deleteMany(),
    prisma.estateProfile.deleteMany(),
    prisma.client.deleteMany(),
    prisma.userRole.deleteMany(),
    prisma.user.deleteMany(),
    prisma.role.deleteMany(),
    prisma.taxPeriod.deleteMany(),
    prisma.taxType.deleteMany(),
    prisma.reviewStatus.deleteMany(),
    prisma.documentCategory.deleteMany(),
    prisma.firm.deleteMany(),
    prisma.calculationTemplate.deleteMany(),
    prisma.auditLog.deleteMany(),
  ]);

  const firm = await prisma.firm.create({
    data: {
      name: "Ubuntu Tax Advisory",
      registrationNo: "2018/445566/07",
      email: "admin@ubuntutax.co.za",
      phone: "+27 11 555 0911",
      address: "18 Rivonia Road, Sandton, Johannesburg",
    },
  });

  const roles = await Promise.all(
    [
      { code: RoleCode.ADMIN, name: "Admin" },
      { code: RoleCode.TAX_PRACTITIONER, name: "Tax Practitioner" },
      { code: RoleCode.REVIEWER, name: "Reviewer / Manager" },
      { code: RoleCode.STAFF, name: "Staff / Data Capturer" },
      { code: RoleCode.CLIENT_PORTAL, name: "Client Portal User" },
    ].map((role) =>
      prisma.role.create({
        data: {
          code: role.code,
          name: role.name,
          description: `${role.name} role`,
        },
      }),
    ),
  );

  const [admin, practitioner, reviewer, staff] = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@ubuntutax.co.za",
        fullName: "Nandi Maseko",
        passwordHash,
        firmId: firm.id,
      },
    }),
    prisma.user.create({
      data: {
        email: "practitioner@ubuntutax.co.za",
        fullName: "Kagiso Dlamini",
        passwordHash,
        firmId: firm.id,
      },
    }),
    prisma.user.create({
      data: {
        email: "reviewer@ubuntutax.co.za",
        fullName: "Ayesha Parker",
        passwordHash,
        firmId: firm.id,
      },
    }),
    prisma.user.create({
      data: {
        email: "staff@ubuntutax.co.za",
        fullName: "Sipho Ndlovu",
        passwordHash,
        firmId: firm.id,
      },
    }),
  ]);

  await prisma.userRole.createMany({
    data: [
      { userId: admin.id, roleId: roles.find((r) => r.code === RoleCode.ADMIN)!.id },
      {
        userId: practitioner.id,
        roleId: roles.find((r) => r.code === RoleCode.TAX_PRACTITIONER)!.id,
      },
      { userId: reviewer.id, roleId: roles.find((r) => r.code === RoleCode.REVIEWER)!.id },
      { userId: staff.id, roleId: roles.find((r) => r.code === RoleCode.STAFF)!.id },
    ],
  });

  const [reviewRequired, internalReview] = await Promise.all([
    prisma.reviewStatus.create({
      data: { code: "REVIEW_REQUIRED", label: "Review Required", requiresReviewer: true },
    }),
    prisma.reviewStatus.create({
      data: { code: "INTERNAL_REVIEW", label: "Internal Review", requiresReviewer: true },
    }),
    prisma.reviewStatus.create({
      data: { code: "APPROVED", label: "Approved", requiresReviewer: false, isTerminal: true },
    }),
  ]);

  const taxTypes = await Promise.all(
    [
      { code: "ITR12", label: "Individual Income Tax" },
      { code: "ITR14", label: "Company Income Tax" },
      { code: "VAT201", label: "VAT" },
      { code: "EMP201", label: "PAYE / EMP201" },
      { code: "EMP501", label: "PAYE Reconciliation / EMP501" },
      { code: "IRP6", label: "Provisional Tax" },
      { code: "ESTATE", label: "Deceased Estate Administration" },
    ].map((taxType) =>
      prisma.taxType.create({
        data: {
          code: taxType.code,
          label: taxType.label,
          description: `Sample setup for ${taxType.label}`,
        },
      }),
    ),
  );

  const period2025 = await prisma.taxPeriod.create({
    data: {
      code: "2025-A",
      label: "2025 Assessment Year",
      periodStart: new Date("2025-03-01"),
      periodEnd: new Date("2026-02-28"),
    },
  });

  const docCategories = await prisma.documentCategory.createMany({
    data: [
      { code: "ID", label: "IDs" },
      { code: "FIN_STATEMENTS", label: "Financial Statements" },
      { code: "IRP5", label: "IRP5s" },
      { code: "BANK_STATEMENT", label: "Bank Statements" },
      { code: "TAX_CERTIFICATE", label: "Tax Certificates" },
      { code: "CORRESPONDENCE", label: "Correspondence" },
      { code: "ESTATE_DOC", label: "Estate Documents" },
      { code: "SARS_LETTER", label: "SARS Letters" },
      { code: "OBJECTION_SUPPORT", label: "Objection Supporting Documents" },
    ],
  });

  void docCategories;

  const clientA = await prisma.client.create({
    data: {
      firmId: firm.id,
      code: "CLI-0001",
      displayName: "Thabo Mokoena",
      clientType: ClientType.INDIVIDUAL,
      status: ClientStatus.ACTIVE,
      taxReferenceNumber: "9001/123/45/6",
      email: "thabo@example.co.za",
      phone: "+27 82 000 1111",
      address: "Pretoria, Gauteng",
      notes: "Primary salary and rental income.",
    },
  });

  const clientB = await prisma.client.create({
    data: {
      firmId: firm.id,
      code: "CLI-0002",
      displayName: "Inala Manufacturing (Pty) Ltd",
      clientType: ClientType.COMPANY,
      status: ClientStatus.ACTIVE,
      registrationNumber: "2016/124578/07",
      taxReferenceNumber: "9412/456/78/9",
      vatNumber: "4450192251",
      payeNumber: "7000123456",
      email: "finance@inala.co.za",
      phone: "+27 31 222 3333",
      address: "Durban, KwaZulu-Natal",
    },
  });

  const estateClient = await prisma.client.create({
    data: {
      firmId: firm.id,
      code: "CLI-0003",
      displayName: "Estate Late Nomsa Dube",
      clientType: ClientType.ESTATE,
      status: ClientStatus.ONBOARDING,
      notes: "Master file opened, valuation checklist pending.",
    },
  });

  await prisma.clientProfile.create({
    data: {
      clientId: clientA.id,
      identificationNumber: "8501010123082",
      dateOfBirth: new Date("1985-01-01"),
      industry: "Professional Services",
    },
  });

  await prisma.estateProfile.create({
    data: {
      clientId: estateClient.id,
      deceasedFullName: "Nomsa Dube",
      dateOfDeath: new Date("2025-06-14"),
      letterOfExecutorshipNo: "001234/2025",
      valuationRequired: true,
    },
  });

  await prisma.estateYearPack.create({
    data: {
      taxYear: 2026,
      version: 1,
      status: EstateYearPackStatus.APPROVED,
      effectiveFrom: new Date("2026-03-01"),
      approvedAt: new Date("2026-03-12"),
      sourceReference: "Illustrative 2026 deceased-estate filing pack baseline",
      rulesJson: {
        cgtInclusionRate: 0.4,
        cgtAnnualExclusionOnDeath: 300000,
        cgtPrimaryResidenceExclusion: 2000000,
        estateDutyAbatement: 3500000,
        estateDutyRateBands: [
          { upTo: 30000000, rate: 0.2 },
          { upTo: null, rate: 0.25 },
        ],
        postDeathFlatRate: 0.45,
        businessValuationMethods: ["NET_ASSET_VALUE", "MAINTAINABLE_EARNINGS"],
      },
      formTemplates: {
        create: [
          {
            code: EstateFormTemplateCode.BUSINESS_VALUATION_REPORT,
            templateVersion: "2026.1",
            outputFormat: "docx",
            storageKey: "estates/forms/business-valuation-report/2026.1.docx",
            metadataJson: {
              title: "Business valuation report",
              jurisdiction: "SARS",
            },
          },
          {
            code: EstateFormTemplateCode.SARS_ITR12,
            templateVersion: "2026.1",
            outputFormat: "pdf",
            storageKey: "estates/forms/sars-itr12/2026.1.json",
            metadataJson: {
              title: "SARS ITR12",
              jurisdiction: "SARS",
            },
          },
          {
            code: EstateFormTemplateCode.SARS_CGT_DEATH,
            templateVersion: "2026.1",
            outputFormat: "pdf",
            storageKey: "estates/forms/sars-cgt-death/2026.1.json",
            metadataJson: {
              title: "SARS CGT on death schedule",
              jurisdiction: "SARS",
            },
          },
          {
            code: EstateFormTemplateCode.SARS_REV267,
            templateVersion: "2026.1",
            outputFormat: "pdf",
            storageKey: "estates/forms/sars-rev267/2026.1.json",
            metadataJson: {
              title: "SARS Rev267",
              jurisdiction: "SARS",
            },
          },
          {
            code: EstateFormTemplateCode.SARS_IT_AE,
            templateVersion: "2026.1",
            outputFormat: "pdf",
            storageKey: "estates/forms/sars-it-ae/2026.1.json",
            metadataJson: {
              title: "SARS IT-AE",
              jurisdiction: "SARS",
            },
          },
          {
            code: EstateFormTemplateCode.MASTER_LD_ACCOUNT,
            templateVersion: "2026.1",
            outputFormat: "pdf",
            storageKey: "estates/forms/master-ld-account/2026.1.json",
            metadataJson: {
              title: "Master liquidation and distribution account",
              jurisdiction: "MASTER",
            },
          },
        ],
      },
    },
  });

  await prisma.estateYearPack.create({
    data: {
      taxYear: 2027,
      version: 1,
      status: EstateYearPackStatus.APPROVED,
      effectiveFrom: new Date("2027-03-01"),
      approvedAt: new Date("2027-03-16"),
      sourceReference: "Illustrative 2027 deceased-estate filing pack baseline",
      rulesJson: {
        cgtInclusionRate: 0.4,
        cgtAnnualExclusionOnDeath: 300000,
        cgtPrimaryResidenceExclusion: 2000000,
        estateDutyAbatement: 3500000,
        estateDutyRateBands: [
          { upTo: 30000000, rate: 0.2 },
          { upTo: null, rate: 0.25 },
        ],
        postDeathFlatRate: 0.45,
        businessValuationMethods: ["NET_ASSET_VALUE", "MAINTAINABLE_EARNINGS"],
      },
      formTemplates: {
        create: [
          {
            code: EstateFormTemplateCode.BUSINESS_VALUATION_REPORT,
            templateVersion: "2027.1",
            outputFormat: "docx",
            storageKey: "estates/forms/business-valuation-report/2027.1.docx",
            metadataJson: {
              title: "Business valuation report",
              jurisdiction: "SARS",
            },
          },
          {
            code: EstateFormTemplateCode.SARS_ITR12,
            templateVersion: "2027.1",
            outputFormat: "pdf",
            storageKey: "estates/forms/sars-itr12/2027.1.json",
            metadataJson: {
              title: "SARS ITR12",
              jurisdiction: "SARS",
            },
          },
          {
            code: EstateFormTemplateCode.SARS_CGT_DEATH,
            templateVersion: "2027.1",
            outputFormat: "pdf",
            storageKey: "estates/forms/sars-cgt-death/2027.1.json",
            metadataJson: {
              title: "SARS CGT on death schedule",
              jurisdiction: "SARS",
            },
          },
          {
            code: EstateFormTemplateCode.SARS_REV267,
            templateVersion: "2027.1",
            outputFormat: "pdf",
            storageKey: "estates/forms/sars-rev267/2027.1.json",
            metadataJson: {
              title: "SARS Rev267",
              jurisdiction: "SARS",
            },
          },
          {
            code: EstateFormTemplateCode.SARS_IT_AE,
            templateVersion: "2027.1",
            outputFormat: "pdf",
            storageKey: "estates/forms/sars-it-ae/2027.1.json",
            metadataJson: {
              title: "SARS IT-AE",
              jurisdiction: "SARS",
            },
          },
          {
            code: EstateFormTemplateCode.MASTER_LD_ACCOUNT,
            templateVersion: "2027.1",
            outputFormat: "pdf",
            storageKey: "estates/forms/master-ld-account/2027.1.json",
            metadataJson: {
              title: "Master liquidation and distribution account",
              jurisdiction: "MASTER",
            },
          },
        ],
      },
    },
  });

  const [article1, article2] = await Promise.all([
    prisma.knowledgeBaseArticle.create({
      data: {
        title: "Illustrative SARS verification workflow notes",
        category: "administration",
        effectiveDate: new Date("2025-01-01"),
        sourceReference: "Sample internal working note (illustrative)",
        summary:
          "Illustrative only: outlines common evidence pack requirements during SARS verification.",
        body: "This sample content is for product demonstration and must be replaced with verified legal references before production use.",
        tags: ["verification", "supporting-documents", "illustrative"],
        relatedModules: ["cases", "documents"],
        isIllustrative: true,
      },
    }),
    prisma.knowledgeBaseArticle.create({
      data: {
        title: "Illustrative provisional tax checklist",
        category: "individual-tax",
        effectiveDate: new Date("2025-03-01"),
        sourceReference: "Sample checklist (illustrative)",
        summary: "Illustrative only: provisional tax working checklist template.",
        body: "Illustrative sample only. Confirm legal interpretation and latest thresholds before filing.",
        tags: ["provisional-tax", "itr12", "illustrative"],
        relatedModules: ["knowledge-base", "deadlines"],
        isIllustrative: true,
      },
    }),
  ]);

  const [case1, case2, case3] = await Promise.all([
    prisma.case.create({
      data: {
        firmId: firm.id,
        clientId: clientA.id,
        taxTypeId: taxTypes.find((t) => t.code === "ITR12")!.id,
        taxPeriodId: period2025.id,
        reviewStatusId: reviewRequired.id,
        createdById: practitioner.id,
        assignedUserId: staff.id,
        reviewerUserId: reviewer.id,
        caseType: CaseType.RETURN_PREPARATION,
        status: CaseStatus.IN_PROGRESS,
        priority: PriorityLevel.HIGH,
        title: "ITR12 2025 filing",
        description: "Collect final medical and retirement certificates before submission.",
        dueDate: new Date("2026-03-20"),
      },
    }),
    prisma.case.create({
      data: {
        firmId: firm.id,
        clientId: clientB.id,
        taxTypeId: taxTypes.find((t) => t.code === "VAT201")!.id,
        taxPeriodId: period2025.id,
        reviewStatusId: internalReview.id,
        createdById: practitioner.id,
        assignedUserId: practitioner.id,
        reviewerUserId: reviewer.id,
        caseType: CaseType.VERIFICATION,
        status: CaseStatus.UNDER_REVIEW,
        priority: PriorityLevel.CRITICAL,
        title: "VAT verification response",
        description: "SARS requested source invoices and import documentation.",
        dueDate: new Date("2026-03-10"),
      },
    }),
    prisma.case.create({
      data: {
        firmId: firm.id,
        clientId: estateClient.id,
        taxTypeId: taxTypes.find((t) => t.code === "ESTATE")!.id,
        reviewStatusId: reviewRequired.id,
        createdById: admin.id,
        assignedUserId: staff.id,
        caseType: CaseType.COMPLIANCE_FOLLOW_UP,
        status: CaseStatus.AWAITING_DOCUMENTS,
        priority: PriorityLevel.MEDIUM,
        title: "Estate valuation onboarding",
        description: "Awaiting property valuation and bank confirmations.",
        dueDate: new Date("2026-03-28"),
      },
    }),
  ]);

  const itr12Profile = await prisma.iTR12Profile.create({
    data: {
      caseId: case1.id,
      assessmentYear: 2026,
      periodStart: new Date("2025-03-01"),
      periodEnd: new Date("2026-02-28"),
      workflowState: ITR12WorkflowState.WORKING_PAPERS_PREP,
      assumptions: [
        "Salary income is based on available IRP5 records.",
        "Rental schedule in draft form pending final reconciliation.",
      ],
    },
  });

  void itr12Profile;

  await prisma.iTR12Workpaper.createMany({
    data: [
      {
        caseId: case1.id,
        code: "EMP_INC",
        title: "Employment Income Schedule",
        status: ITR12WorkpaperStatus.READY_FOR_REVIEW,
        sourceReference: "IRP5 certificates (illustrative placeholder)",
        notes: "Gross remuneration reconciled; fringe benefits pending manager check.",
      },
      {
        caseId: case1.id,
        code: "MED_CRED",
        title: "Medical Credits Schedule",
        status: ITR12WorkpaperStatus.IN_PROGRESS,
        sourceReference: "Medical aid tax certificate (illustrative placeholder)",
        notes: "Dependant month count requires confirmation.",
      },
      {
        caseId: case1.id,
        code: "RET_DED",
        title: "Retirement Contribution Cap Check",
        status: ITR12WorkpaperStatus.TODO,
        sourceReference: "Retirement annuity certificates (illustrative placeholder)",
      },
    ],
  });

  const itr12Run = await prisma.iTR12CalculationRun.create({
    data: {
      caseId: case1.id,
      assessmentYear: 2026,
      status: ITR12CalculationRunStatus.REVIEW_REQUIRED,
      summary: {
        taxableIncome: 880000,
        grossTax: 272800,
        totalCredits: 212000,
        netPayableOrRefund: 60800,
      },
      legalDisclaimer:
        "Outputs are generated for workflow assistance only and remain subject to professional review and legal verification before any SARS filing.",
    },
  });

  await prisma.iTR12CalculationLineItem.createMany({
    data: [
      {
        runId: itr12Run.id,
        lineCode: "TAXABLE_INCOME",
        label: "Taxable Income Summary",
        amount: "880000.00",
        working:
          "Employment income + other income - deductions - deductible retirement contribution",
        assumptions: [
          "All income streams captured for the period 2025-03-01 to 2026-02-28.",
        ],
        sourceReference:
          "Illustrative scaffold for 2026 assessment year. Verify against current SARS guidance and legislation before filing.",
      },
      {
        runId: itr12Run.id,
        lineCode: "TOTAL_CREDITS",
        label: "Total Credits",
        amount: "212000.00",
        working: "PAYE credits + provisional payments + medical credits",
        assumptions: [
          "Credits should be reconciled against source certificates and SARS statements.",
        ],
        sourceReference:
          "Illustrative scaffold for 2026 assessment year. Verify against current SARS guidance and legislation before filing.",
      },
      {
        runId: itr12Run.id,
        lineCode: "NET_PAYABLE_OR_REFUND",
        label: "Estimated Net Payable / (Refund)",
        amount: "60800.00",
        working: "Gross tax - total credits",
        assumptions: ["Final liability requires reviewer sign-off before submission."],
        sourceReference:
          "Illustrative scaffold for 2026 assessment year. Verify against current SARS guidance and legislation before filing.",
      },
    ],
  });

  await prisma.iTR12Assumption.createMany({
    data: [
      {
        runId: itr12Run.id,
        assumption:
          "Estimated rate and line computations are scaffold placeholders, not final legal computations.",
        sourceReference: "Internal policy note (illustrative)",
      },
      {
        runId: itr12Run.id,
        assumption: "Medical credit input must match validated third-party certificates.",
        sourceReference: "Medical aid tax certificate (illustrative placeholder)",
      },
    ],
  });

  await prisma.iTR12ReviewChecklist.create({
    data: {
      runId: itr12Run.id,
      reviewerId: reviewer.id,
      status: "PENDING_REVIEW",
      notes: "Reviewer to confirm assumptions and source documentation before filing.",
    },
  });

  await prisma.caseActivity.createMany({
    data: [
      {
        caseId: case1.id,
        actorId: practitioner.id,
        action: "CASE_CREATED",
        summary: "Case opened and assigned to data team.",
      },
      {
        caseId: case1.id,
        actorId: staff.id,
        action: "DOC_REQUEST_SENT",
        summary: "Requested retirement annuity certificate from client.",
      },
      {
        caseId: case2.id,
        actorId: reviewer.id,
        action: "REVIEW_STARTED",
        summary: "Reviewer started quality control on draft response.",
      },
    ],
  });

  const correspondenceCategory = await prisma.documentCategory.findUniqueOrThrow({
    where: { code: "CORRESPONDENCE" },
  });

  const sarsLetterCategory = await prisma.documentCategory.findUniqueOrThrow({
    where: { code: "SARS_LETTER" },
  });

  const letter = await prisma.document.create({
    data: {
      firmId: firm.id,
      clientId: clientB.id,
      uploadedById: practitioner.id,
      categoryId: sarsLetterCategory.id,
      fileName: "VAT-Verification-Request-2026-03-01.pdf",
      storageKey: "demo/vat-verification-request.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 284123,
      visibility: DocumentVisibility.INTERNAL,
      tags: ["vat", "verification", "sars"],
    },
  });

  const memo = await prisma.document.create({
    data: {
      firmId: firm.id,
      clientId: clientA.id,
      uploadedById: staff.id,
      categoryId: correspondenceCategory.id,
      fileName: "ITR12-client-questions-email.msg",
      storageKey: "demo/itr12-client-questions.msg",
      mimeType: "application/vnd.ms-outlook",
      fileSizeBytes: 82111,
      visibility: DocumentVisibility.INTERNAL,
      tags: ["itr12", "query"],
    },
  });

  await prisma.caseDocument.createMany({
    data: [
      { caseId: case2.id, documentId: letter.id },
      { caseId: case1.id, documentId: memo.id },
    ],
  });

  await prisma.caseKnowledgeArticle.createMany({
    data: [
      { caseId: case2.id, articleId: article1.id },
      { caseId: case1.id, articleId: article2.id },
    ],
  });

  const deadline1 = await prisma.deadline.create({
    data: {
      caseId: case2.id,
      reviewStatusId: internalReview.id,
      title: "Submit verification response pack",
      dueAt: new Date("2026-03-10T14:00:00+02:00"),
      notes: "Include invoice trail and customs documentation.",
    },
  });

  await prisma.deadline.create({
    data: {
      caseId: case1.id,
      reviewStatusId: reviewRequired.id,
      title: "Finalize ITR12 supporting docs",
      dueAt: new Date("2026-03-20T17:00:00+02:00"),
    },
  });

  await prisma.reminder.create({
    data: {
      deadlineId: deadline1.id,
      caseId: case2.id,
      reminderForUserId: practitioner.id,
      scheduledFor: new Date("2026-03-08T08:30:00+02:00"),
      note: "Escalate to reviewer if documents incomplete.",
    },
  });

  await prisma.task.createMany({
    data: [
      {
        caseId: case2.id,
        clientId: clientB.id,
        ownerId: practitioner.id,
        reviewStatusId: internalReview.id,
        title: "Reconcile VAT control account to trial balance",
        status: "IN_PROGRESS",
        priority: PriorityLevel.HIGH,
        dueDate: new Date("2026-03-09"),
      },
      {
        caseId: case3.id,
        clientId: estateClient.id,
        ownerId: staff.id,
        reviewStatusId: reviewRequired.id,
        title: "Collect deed office valuation documents",
        status: "TODO",
        priority: PriorityLevel.MEDIUM,
        dueDate: new Date("2026-03-18"),
      },
    ],
  });

  const individualTaxRuleVersion = await prisma.individualTaxRuleVersion.create({
    data: {
      ruleYear: 2026,
      versionLabel: "2026.1.0",
      effectiveFrom: new Date("2025-03-01"),
      rulesJson: {
        type: "scaffold",
        note: "Illustrative baseline for TaxOps workflow.",
      },
      isActive: true,
    },
  });

  const individualTaxProfile = await prisma.individualTaxProfile.create({
    data: {
      clientId: clientA.id,
      taxpayerName: "M MABUTI",
      referenceNumber: "0441296142",
      address: "14A Greenwood Street, Berea, East London, 5247",
    },
  });

  const individualTaxAssessment = await prisma.individualTaxAssessment.create({
    data: {
      profileId: individualTaxProfile.id,
      ruleVersionId: individualTaxRuleVersion.id,
      assessmentYear: 2026,
      assessmentDate: new Date("2025-11-28"),
      status: IndividualTaxAssessmentStatus.REVIEW_REQUIRED,
      taxpayerName: "M MABUTI",
      referenceNumber: "0441296142",
      salaryIncome: "1324650.00",
      localInterest: "5493.00",
      travelAllowance: "324000.00",
      retirementContributions: "102301.00",
      travelDeduction: "297124.00",
      rebates: "17235.00",
      medicalTaxCredit: "11688.00",
      paye: "214185.48",
      priorAssessmentDebitOrCredit: "-47166.76",
      effectiveTaxRate: "0.27800",
    },
  });

  await prisma.individualTaxLineItem.createMany({
    data: [
      {
        assessmentId: individualTaxAssessment.id,
        section: IndividualTaxLineSection.INCOME,
        code: "3601",
        description: "Employment income [IRP5/IT3(a)]",
        computations: "Declared taxable salary income",
        amountAssessed: "1324650.00",
        sourceReference:
          "TaxOps 2026 scaffold logic. Verify calculations against current legislation before filing.",
      },
      {
        assessmentId: individualTaxAssessment.id,
        section: IndividualTaxLineSection.DEDUCTION,
        code: "4029",
        description: "Retirement fund contributions",
        computations: "Retirement contributions allowed",
        amountAssessed: "-102301.00",
        sourceReference:
          "TaxOps 2026 scaffold logic. Verify calculations against current legislation before filing.",
      },
      {
        assessmentId: individualTaxAssessment.id,
        section: IndividualTaxLineSection.TAX_CALCULATION,
        code: "4102",
        description: "PAYE",
        computations: "Employees' tax",
        amountAssessed: "-214185.48",
        sourceReference:
          "TaxOps 2026 scaffold logic. Verify calculations against current legislation before filing.",
      },
    ],
  });

  await prisma.individualTaxNote.createMany({
    data: [
      {
        assessmentId: individualTaxAssessment.id,
        noteOrder: 1,
        noteText:
          "Output generated as TaxOps workflow assistance only; professional review required.",
      },
      {
        assessmentId: individualTaxAssessment.id,
        noteOrder: 2,
        noteText:
          "All values must be verified against final source documents and current SARS requirements.",
      },
    ],
  });

  await prisma.generatedReport.create({
    data: {
      assessmentId: individualTaxAssessment.id,
      reportType: GeneratedReportType.INDIVIDUAL_TAX_ASSESSMENT,
      storageKey: "demo/reports/individual-tax-m-mabuti.pdf",
      checksum: "illustrative-only",
      generatedById: practitioner.id,
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: practitioner.id,
        action: "CASE_CREATED",
        entityType: "Case",
        entityId: case1.id,
        summary: "Opened ITR12 2025 filing case.",
      },
      {
        actorId: reviewer.id,
        action: "STATUS_CHANGED",
        entityType: "Case",
        entityId: case2.id,
        summary: "Moved case to UNDER_REVIEW.",
      },
    ],
  });

  console.log("Seed complete. Demo login password for all users: ChangeMe123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

