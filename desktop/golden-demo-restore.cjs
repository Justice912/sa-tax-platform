const fs = require("node:fs");
const path = require("node:path");

const goldenDemoBundle = require("./golden-demo-bundle.json");

const estateStoreFileName = "demo-estates.json";
const individualTaxAssessmentsFileName = "demo-individual-tax-assessments.json";
const estateEngineRunsFileName = "demo-estate-engine-runs.json";
const estateCollectionKeys = [
  "estates",
  "assets",
  "liabilities",
  "beneficiaries",
  "checklistItems",
  "stageEvents",
  "liquidationEntries",
  "liquidationDistributions",
  "executorAccess",
];

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureStorageRoot(storageRoot) {
  fs.mkdirSync(storageRoot, { recursive: true });
}

function readJsonFile(filePath, fallbackValue) {
  try {
    if (!fs.existsSync(filePath)) {
      return cloneValue(fallbackValue);
    }

    const raw = fs.readFileSync(filePath, "utf8").trim();
    if (!raw) {
      return cloneValue(fallbackValue);
    }

    return JSON.parse(raw);
  } catch {
    return cloneValue(fallbackValue);
  }
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function mergeRecordsById(existingRecords, baselineRecords) {
  const preservedRecords = [];
  const mergedById = new Map();

  for (const record of Array.isArray(existingRecords) ? existingRecords : []) {
    if (!record || typeof record !== "object" || typeof record.id !== "string") {
      preservedRecords.push(cloneValue(record));
      continue;
    }

    mergedById.set(record.id, cloneValue(record));
  }

  for (const record of Array.isArray(baselineRecords) ? baselineRecords : []) {
    if (!record || typeof record !== "object" || typeof record.id !== "string") {
      preservedRecords.push(cloneValue(record));
      continue;
    }

    mergedById.set(record.id, cloneValue(record));
  }

  return preservedRecords.concat(Array.from(mergedById.values()));
}

function buildEmptyEstateStore() {
  return {
    estates: [],
    assets: [],
    liabilities: [],
    beneficiaries: [],
    checklistItems: [],
    stageEvents: [],
    liquidationEntries: [],
    liquidationDistributions: [],
    executorAccess: [],
  };
}

function restoreEstateStore(storageRoot) {
  const filePath = path.join(storageRoot, estateStoreFileName);
  const existingStore = readJsonFile(filePath, buildEmptyEstateStore());
  const restoredStore = buildEmptyEstateStore();
  const baselineStore = goldenDemoBundle.estateStore ?? buildEmptyEstateStore();

  for (const collectionKey of estateCollectionKeys) {
    restoredStore[collectionKey] = mergeRecordsById(
      existingStore?.[collectionKey],
      baselineStore?.[collectionKey],
    );
  }

  writeJsonFile(filePath, restoredStore);
  return restoredStore;
}

function restoreArrayStore(storageRoot, fileName, baselineRecords) {
  const filePath = path.join(storageRoot, fileName);
  const existingRecords = readJsonFile(filePath, []);
  const restoredRecords = mergeRecordsById(existingRecords, baselineRecords);
  writeJsonFile(filePath, restoredRecords);
  return restoredRecords;
}

function restoreGoldenDemoData(input = {}) {
  const storageRoot = input.storageRoot
    ? path.resolve(input.storageRoot)
    : path.join(process.cwd(), ".storage");

  ensureStorageRoot(storageRoot);

  const estateStore = restoreEstateStore(storageRoot);
  const individualTaxAssessments = restoreArrayStore(
    storageRoot,
    individualTaxAssessmentsFileName,
    goldenDemoBundle.individualTaxAssessments ?? [],
  );
  const estateEngineRuns = restoreArrayStore(
    storageRoot,
    estateEngineRunsFileName,
    goldenDemoBundle.estateEngineRuns ?? [],
  );

  return {
    storageRoot,
    estateCount: estateStore.estates.length,
    individualTaxAssessmentCount: individualTaxAssessments.length,
    estateEngineRunCount: estateEngineRuns.length,
  };
}

if (require.main === module) {
  const storageRoot = process.argv[2] ?? process.env.STORAGE_ROOT ?? path.join(process.cwd(), ".storage");
  const result = restoreGoldenDemoData({ storageRoot });
  console.log(
    `Golden demo data restored in ${result.storageRoot} (estates=${String(result.estateCount)}, assessments=${String(result.individualTaxAssessmentCount)}, engineRuns=${String(result.estateEngineRunCount)}).`,
  );
}

module.exports = {
  restoreGoldenDemoData,
};
