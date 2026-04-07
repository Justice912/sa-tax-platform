"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════
   SARS CONSTANTS — 2024/2025 Tax Year
   ═══════════════════════════════════════════ */
const TAX_BRACKETS = [
  { min: 0, max: 237100, rate: 0.18, base: 0 },
  { min: 237101, max: 370500, rate: 0.26, base: 42678 },
  { min: 370501, max: 512800, rate: 0.31, base: 77362 },
  { min: 512801, max: 673000, rate: 0.36, base: 121475 },
  { min: 673001, max: 857900, rate: 0.39, base: 179147 },
  { min: 857901, max: 1817000, rate: 0.41, base: 251258 },
  { min: 1817001, max: Infinity, rate: 0.45, base: 644489 },
];
const REBATES = { primary: 17235, secondary: 9444, tertiary: 3145 };
const MEDICAL_CREDITS = { mainPlus1: 364, additional: 246 };
const DEEMED_COST_TABLE = [
  { min: 0, max: 100000, fixed: 4637, fuel: 159.3, maint: 76.1 },
  { min: 100001, max: 200000, fixed: 8253, fuel: 176.6, maint: 97.3 },
  { min: 200001, max: 300000, fixed: 11802, fuel: 186.8, maint: 115.4 },
  { min: 300001, max: 400000, fixed: 15077, fuel: 207.3, maint: 128.9 },
  { min: 400001, max: 500000, fixed: 18846, fuel: 228.5, maint: 148.0 },
  { min: 500001, max: 600000, fixed: 22510, fuel: 228.5, maint: 166.8 },
  { min: 600001, max: 700000, fixed: 25503, fuel: 238.0, maint: 176.3 },
  { min: 700001, max: 800000, fixed: 30538, fuel: 253.6, maint: 199.4 },
  { min: 800001, max: Infinity, fixed: 30538, fuel: 253.6, maint: 199.4 },
];
const CGT_EXCLUSION = 40000;
const CGT_DEATH_EXCLUSION = 300000;
const CGT_PRIMARY_RES = 2000000;
const CGT_INCLUSION_RATE = 0.40;
const RETIRE_PERCENT = 0.275;
const RETIRE_CAP = 350000;

const calcTax = (taxable: number) => {
  if (taxable <= 0) return 0;
  const b = TAX_BRACKETS.find((br) => taxable >= br.min && taxable <= br.max);
  if (!b) return 0;
  return b.base + (taxable - b.min + 1) * b.rate;
};
const getMarginalRate = (taxable: number) => {
  if (taxable <= 0) return 0.18;
  const b = TAX_BRACKETS.find((br) => taxable >= br.min && taxable <= br.max);
  return b ? b.rate : 0.45;
};
const getDeemedRate = (v: number) =>
  DEEMED_COST_TABLE.find((r) => v >= r.min && v <= r.max) ??
  DEEMED_COST_TABLE[0];
const fmt = (n: number) =>
  "R " +
  Number(n || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const fmtKm = (n: number) =>
  Number(n || 0).toLocaleString("en-ZA", { maximumFractionDigits: 1 }) + " km";
const pct = (n: number) => (n || 0).toFixed(1) + "%";
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type TabKey =
  | "dashboard"
  | "travel"
  | "medical"
  | "retirement"
  | "cgt"
  | "provisional"
  | "rental"
  | "homeoffice";

interface Trip {
  id: number;
  date: string;
  from: string;
  to: string;
  odometerStart: string | number;
  odometerEnd: string | number;
  purpose: string;
  tripType: "Business" | "Private" | "Mixed";
  mixedSplit: number;
  businessKm: number;
  privateKm: number;
  totalDistance: number;
}

interface UploadData {
  headers: string[];
  rows: Record<string, string>[];
  name: string;
}

/* ═══════════════════════════════════════════
   HELPERS — Reusable UI pieces (Tailwind)
   ═══════════════════════════════════════════ */

function StatCard({
  label,
  value,
  colorClass = "text-amber-500",
}: {
  label: string;
  value: string | number;
  colorClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-bold font-mono ${colorClass}`}>
        {value}
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  colorClass = "text-amber-500",
  sub,
}: {
  label: string;
  value: string | number;
  colorClass?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3.5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-base font-bold font-mono ${colorClass}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

function Highlight({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-5 text-center">
      <div className="text-sm font-semibold text-teal-700">{label}</div>
      <div className="mt-1.5 text-2xl font-bold font-mono text-teal-800">
        {value}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-400 focus:outline-none";
const selectCls = inputCls;

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export function TaxTools() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // ── Travel Logbook State ──
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripForm, setTripForm] = useState<Trip | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState("all");
  const [vehicleValue, setVehicleValue] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [colMap, setColMap] = useState({
    date: "",
    from: "",
    to: "",
    odometerStart: "",
    odometerEnd: "",
    purpose: "",
  });
  const [importTrips, setImportTrips] = useState<Trip[]>([]);
  const [uploadStep, setUploadStep] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Medical Credits State ──
  const [med, setMed] = useState({
    dependants: 1,
    monthlyContrib: "",
    outOfPocket: "",
    age: "under65",
    disability: false,
    taxableIncome: "",
  });

  // ── Retirement State ──
  const [ret, setRet] = useState({
    income: "",
    employerContrib: "",
    employeeContrib: "",
    raContrib: "",
    additionalRA: 0,
  });

  // ── CGT State ──
  const [cgt, setCgt] = useState({
    assetType: "Other property",
    proceeds: "",
    baseCost: "",
    improvements: "",
    sellingCosts: "",
    primaryRes: false,
    death: false,
    taxableIncome: "",
  });

  // ── Provisional Tax State ──
  const [prov, setProv] = useState({
    priorTaxable: "",
    priorTax: "",
    estimatedTaxable: "",
    payeDeducted: "",
    credits: "",
    period: "P1",
  });

  // ── Rental State ──
  const [rent, setRent] = useState({
    grossRent: "",
    months: 12,
    otherIncome: "",
    rates: "",
    levies: "",
    insurance: "",
    bondInterest: "",
    repairs: "",
    agentFees: "",
    advertising: "",
    security: "",
    garden: "",
    utilities: "",
    wearTear: "",
    legal: "",
    travelToProperty: "",
  });

  // ── Home Office State ──
  const [ho, setHo] = useState({
    empType: "commission",
    totalArea: "",
    officeArea: "",
    rentOrInterest: "",
    rates: "",
    electricity: "",
    cleaning: "",
    repairs: "",
    internet: "",
  });

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const notify = useCallback(
    (msg: string, type: "success" | "error" = "success") =>
      setToast({ msg, type }),
    [],
  );

  // ── Trip helpers ──
  const allocTrip = (t: Trip): Trip => {
    const km = Math.max(
      0,
      (parseFloat(String(t.odometerEnd)) || 0) -
        (parseFloat(String(t.odometerStart)) || 0),
    );
    if (t.tripType === "Business")
      return { ...t, businessKm: km, privateKm: 0, totalDistance: km };
    if (t.tripType === "Private")
      return { ...t, businessKm: 0, privateKm: km, totalDistance: km };
    const biz = Math.round((km * (t.mixedSplit || 50)) / 100 * 10) / 10;
    return {
      ...t,
      businessKm: biz,
      privateKm: Math.round((km - biz) * 10) / 10,
      totalDistance: km,
    };
  };

  const newTrip = (): Trip => ({
    id: Date.now() + Math.random(),
    date: new Date().toISOString().slice(0, 10),
    from: "",
    to: "",
    odometerStart: "",
    odometerEnd: "",
    purpose: "",
    tripType: "Business",
    mixedSplit: 50,
    businessKm: 0,
    privateKm: 0,
    totalDistance: 0,
  });

  const saveTrip = () => {
    if (!tripForm) return;
    if (
      !tripForm.date ||
      !tripForm.odometerStart ||
      !tripForm.odometerEnd
    ) {
      notify("Date & odometer required", "error");
      return;
    }
    if (
      parseFloat(String(tripForm.odometerEnd)) <=
      parseFloat(String(tripForm.odometerStart))
    ) {
      notify("End must exceed start", "error");
      return;
    }
    if (
      (tripForm.tripType === "Business" || tripForm.tripType === "Mixed") &&
      !tripForm.purpose.trim()
    ) {
      notify("Purpose required for business/mixed trips", "error");
      return;
    }
    const t = allocTrip(tripForm);
    if (editId) {
      setTrips((p) => p.map((x) => (x.id === editId ? t : x)));
      setEditId(null);
    } else {
      setTrips((p) => [...p, t]);
    }
    setTripForm(null);
    notify(editId ? "Trip updated" : "Trip added");
  };

  const changeTripType = (id: number, newType: Trip["tripType"]) => {
    setTrips((p) =>
      p.map((t) => (t.id === id ? allocTrip({ ...t, tripType: newType }) : t)),
    );
  };

  // Trip stats
  const tripStats = trips.reduce(
    (a, t) => ({
      totalKm: a.totalKm + t.totalDistance,
      bizKm: a.bizKm + t.businessKm,
      privKm: a.privKm + t.privateKm,
      count: a.count + 1,
    }),
    { totalKm: 0, bizKm: 0, privKm: 0, count: 0 },
  );
  const bizPct =
    tripStats.totalKm > 0
      ? (tripStats.bizKm / tripStats.totalKm) * 100
      : 0;

  // Deemed cost
  const vVal = parseFloat(vehicleValue) || 0;
  const sRate = getDeemedRate(vVal);
  const deemedFixed = sRate.fixed * 12;
  const deemedFuel = sRate.fuel * tripStats.totalKm;
  const deemedMaint = sRate.maint * tripStats.totalKm;
  const deemedTotal = deemedFixed + deemedFuel + deemedMaint;
  const travelDeduction = (deemedTotal * bizPct) / 100;

  // ── Medical calc ──
  const calcMedical = () => {
    const deps = parseInt(String(med.dependants)) || 1;
    const contrib = (parseFloat(med.monthlyContrib) || 0) * 12;
    const oop = parseFloat(med.outOfPocket) || 0;
    const taxInc = parseFloat(med.taxableIncome) || 0;
    const s6aMonthly =
      Math.min(deps, 2) * MEDICAL_CREDITS.mainPlus1 +
      Math.max(0, deps - 2) * MEDICAL_CREDITS.additional;
    const s6a = Math.min(s6aMonthly * 12, contrib);
    let s6b = 0;
    if (med.age !== "under65" || med.disability) {
      const qual = oop + Math.max(0, contrib - 3 * s6a);
      s6b = Math.max(0, qual * 0.333);
    } else {
      const qual = oop - 0.075 * taxInc - 3 * s6a;
      s6b = Math.max(0, qual * 0.25);
    }
    return {
      s6a: Math.round(s6a),
      s6b: Math.round(s6b),
      total: Math.round(s6a + s6b),
    };
  };
  const medResult = calcMedical();

  // ── Retirement calc ──
  const calcRetire = () => {
    const inc = parseFloat(ret.income) || 0;
    const empC = (parseFloat(ret.employerContrib) || 0) * 12;
    const eeC = (parseFloat(ret.employeeContrib) || 0) * 12;
    const raC = (parseFloat(ret.raContrib) || 0) * 12;
    const current = empC + eeC + raC;
    const limit = Math.min(inc * RETIRE_PERCENT, RETIRE_CAP);
    const headroom = Math.max(0, limit - current);
    const addRA = ret.additionalRA * 12;
    const usable = Math.min(addRA, headroom);
    const marginal = getMarginalRate(inc);
    const saving = usable * marginal;
    return { current, limit, headroom, usable, saving, marginal };
  };
  const retResult = calcRetire();

  // ── CGT calc ──
  const calcCGT = () => {
    const proceeds = parseFloat(cgt.proceeds) || 0;
    const base = parseFloat(cgt.baseCost) || 0;
    const impr = parseFloat(cgt.improvements) || 0;
    const sell = parseFloat(cgt.sellingCosts) || 0;
    const taxInc = parseFloat(cgt.taxableIncome) || 0;
    const gain = proceeds - base - impr - sell;
    let exclusion = cgt.death ? CGT_DEATH_EXCLUSION : CGT_EXCLUSION;
    if (cgt.primaryRes && gain > 0)
      exclusion += Math.min(gain, CGT_PRIMARY_RES);
    const netGain = Math.max(0, gain - exclusion);
    const taxableGain = netGain * CGT_INCLUSION_RATE;
    const marginal = getMarginalRate(taxInc);
    const cgtPayable = taxableGain * marginal;
    const effectiveRate = gain > 0 ? (cgtPayable / gain) * 100 : 0;
    return {
      gain,
      exclusion,
      netGain,
      taxableGain,
      cgtPayable: Math.round(cgtPayable),
      effectiveRate,
      marginal,
    };
  };
  const cgtResult = calcCGT();

  // ── Provisional tax calc ──
  const calcProv = () => {
    const estTaxable = parseFloat(prov.estimatedTaxable) || 0;
    const paye = parseFloat(prov.payeDeducted) || 0;
    const credits = parseFloat(prov.credits) || 0;
    const priorTax = parseFloat(prov.priorTax) || 0;
    const fullTax = calcTax(estTaxable) - REBATES.primary;
    const netTax = Math.max(0, fullTax - credits);
    let payment = 0;
    if (prov.period === "P1") payment = Math.max(0, netTax * 0.5 - paye * 0.5);
    else payment = Math.max(0, netTax - paye);
    const safeHarbour =
      estTaxable > 1000000 ? priorTax * 0.9 : priorTax * 0.8;
    const risk =
      netTax > 0 && payment < safeHarbour * 0.8
        ? "red"
        : payment < safeHarbour
          ? "amber"
          : "green";
    return {
      fullTax: Math.max(0, Math.round(fullTax)),
      netTax: Math.round(netTax),
      payment: Math.round(payment),
      safeHarbour: Math.round(safeHarbour),
      risk,
    };
  };
  const provResult = calcProv();

  // ── Rental calc ──
  const calcRental = () => {
    const gross =
      (parseFloat(rent.grossRent) || 0) * (parseInt(String(rent.months)) || 12);
    const other = parseFloat(rent.otherIncome) || 0;
    const totalInc = gross + other;
    const expenseKeys = [
      "rates",
      "levies",
      "insurance",
      "bondInterest",
      "repairs",
      "agentFees",
      "advertising",
      "security",
      "garden",
      "utilities",
      "wearTear",
      "legal",
      "travelToProperty",
    ] as const;
    const expenses = expenseKeys.reduce(
      (s, k) => s + (parseFloat(rent[k]) || 0),
      0,
    );
    const net = totalInc - expenses;
    return { totalInc, expenses, net };
  };
  const rentalResult = calcRental();

  // ── Home Office calc ──
  const calcHO = () => {
    const total = parseFloat(ho.totalArea) || 1;
    const office = parseFloat(ho.officeArea) || 0;
    const ratio = Math.min(office / total, 1);
    const shared =
      (parseFloat(ho.rentOrInterest) || 0) +
      (parseFloat(ho.rates) || 0) +
      (parseFloat(ho.electricity) || 0) +
      (parseFloat(ho.cleaning) || 0);
    const direct =
      (parseFloat(ho.repairs) || 0) + (parseFloat(ho.internet) || 0);
    const monthly = shared * ratio + direct;
    const annual = monthly * 12;
    const qualifies = ho.empType !== "salaried";
    return { ratio, monthly, annual, qualifies };
  };
  const hoResult = calcHO();

  // Upload handler
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = (ev.target?.result as string)
        .split("\n")
        .filter((l) => l.trim());
      if (lines.length < 2) {
        notify("Empty file", "error");
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const rows = lines.slice(1).map((l) => {
        const v = l.split(",").map((x) => x.trim());
        const o: Record<string, string> = {};
        headers.forEach((h, i) => (o[h] = v[i] || ""));
        return o;
      });
      setUploadData({ headers, rows, name: file.name });
      setUploadStep(1);
      setTab("travel");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const processImport = () => {
    if (!colMap.date || !colMap.odometerStart || !colMap.odometerEnd) {
      notify("Map Date, Start KM, End KM", "error");
      return;
    }
    if (!uploadData) return;
    const imp: Trip[] = uploadData.rows
      .map((r, i) => {
        const s = parseFloat(r[colMap.odometerStart]) || 0;
        const en = parseFloat(r[colMap.odometerEnd]) || 0;
        return {
          id: Date.now() + i + Math.random(),
          date: r[colMap.date] || "",
          from: r[colMap.from] || "",
          to: r[colMap.to] || "",
          odometerStart: s,
          odometerEnd: en,
          purpose: r[colMap.purpose] || "",
          tripType: "Business" as const,
          mixedSplit: 50,
          businessKm: Math.max(0, en - s),
          privateKm: 0,
          totalDistance: Math.max(0, en - s),
        };
      })
      .filter((t) => t.totalDistance > 0);
    setImportTrips(imp);
    setUploadStep(2);
  };

  const finaliseImport = () => {
    setTrips((p) => [...p, ...importTrips]);
    notify(`${importTrips.length} trips imported`);
    setUploadStep(0);
    setUploadData(null);
    setImportTrips([]);
  };

  const bulkClassify = (type: Trip["tripType"]) => {
    setImportTrips((p) => p.map((t) => allocTrip({ ...t, tripType: type })));
  };

  const exportCSV = () => {
    const h =
      "Date,From,To,Start KM,End KM,Total KM,Trip Type,Business KM,Private KM,Mixed Split %,Purpose\n";
    const r = trips
      .map(
        (t) =>
          `${t.date},"${t.from}","${t.to}",${t.odometerStart},${t.odometerEnd},${t.totalDistance},${t.tripType},${t.businessKm},${t.privateKm},${t.tripType === "Mixed" ? t.mixedSplit : ""},"${t.purpose}"`,
      )
      .join("\n");
    const b = new Blob([h + r], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `SARS_Logbook_${new Date().getFullYear()}.csv`;
    a.click();
  };

  const filteredTrips = trips
    .filter(
      (t) =>
        filterMonth === "all" ||
        new Date(t.date).getMonth() === parseInt(filterMonth),
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Monthly chart
  const monthlyData = MONTHS.map((_, i) => {
    const mt = trips.filter((t) => new Date(t.date).getMonth() === i);
    return {
      biz: mt.reduce((s, t) => s + t.businessKm, 0),
      priv: mt.reduce((s, t) => s + t.privateKm, 0),
    };
  });
  const maxMon = Math.max(...monthlyData.map((d) => d.biz + d.priv), 1);

  const NAV: { key: TabKey; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "travel", label: "Travel Logbook" },
    { key: "medical", label: "Medical Credits" },
    { key: "retirement", label: "Retirement" },
    { key: "cgt", label: "Capital Gains" },
    { key: "provisional", label: "Provisional Tax" },
    { key: "rental", label: "Rental Income" },
    { key: "homeoffice", label: "Home Office" },
  ];

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-5 top-5 z-50 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-lg ${toast.type === "error" ? "bg-red-700" : "bg-teal-700"}`}
        >
          {toast.msg}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt"
        onChange={handleFile}
        className="hidden"
      />

      {/* ── Tab Navigation ── */}
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200/80 bg-white p-1.5 shadow-sm">
        {NAV.map((n) => (
          <button
            key={n.key}
            onClick={() => setTab(n.key)}
            className={`rounded-md px-3.5 py-2 text-sm font-medium transition ${
              tab === n.key
                ? "bg-[#0E2433] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {n.label}
          </button>
        ))}
      </div>

      {/* ════════ DASHBOARD ════════ */}
      {tab === "dashboard" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Individual Tax Dashboard
            </h2>
            <p className="text-sm text-slate-500">
              Tax Year 2024/2025 — Summary of deductions and credits
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="Travel Deduction"
              value={fmt(travelDeduction)}
              colorClass="text-teal-600"
            />
            <StatCard
              label="Medical Credits"
              value={fmt(medResult.total)}
              colorClass="text-sky-600"
            />
            <StatCard
              label="Retirement Headroom"
              value={fmt(retResult.headroom)}
              colorClass="text-violet-600"
            />
            <StatCard
              label="Rental Net Income"
              value={fmt(rentalResult.net)}
              colorClass={
                rentalResult.net >= 0 ? "text-teal-600" : "text-red-500"
              }
            />
            <StatCard
              label="Home Office Deduction"
              value={fmt(hoResult.qualifies ? hoResult.annual : 0)}
              colorClass="text-amber-600"
            />
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Quick Actions
            </h3>
            <div className="flex flex-wrap gap-2">
              {NAV.slice(1).map((n) => (
                <button
                  key={n.key}
                  onClick={() => setTab(n.key)}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════ TRAVEL LOGBOOK ════════ */}
      {tab === "travel" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Travel Logbook
              </h2>
              <p className="text-sm text-slate-500">
                SARS-Compliant &bull; {trips.length} trips logged
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-teal-300 hover:text-teal-700"
                onClick={() => fileRef.current?.click()}
              >
                Upload CSV
              </button>
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-teal-300 hover:text-teal-700"
                onClick={exportCSV}
                disabled={!trips.length}
              >
                Export
              </button>
              <button
                className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white hover:bg-[#12344a]"
                onClick={() => {
                  setTripForm(newTrip());
                  setEditId(null);
                }}
              >
                + New Trip
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="Total Trips"
              value={tripStats.count}
              colorClass="text-amber-500"
            />
            <StatCard
              label="Total KM"
              value={fmtKm(tripStats.totalKm)}
              colorClass="text-sky-600"
            />
            <StatCard
              label="Business KM"
              value={fmtKm(tripStats.bizKm)}
              colorClass="text-teal-600"
            />
            <StatCard
              label="Private KM"
              value={fmtKm(tripStats.privKm)}
              colorClass="text-violet-600"
            />
            <StatCard
              label="Business %"
              value={pct(bizPct)}
              colorClass={
                bizPct >= 80
                  ? "text-teal-600"
                  : bizPct >= 50
                    ? "text-amber-500"
                    : "text-red-500"
              }
            />
          </div>

          {/* Upload Step 1 — Column Mapping */}
          {uploadStep === 1 && uploadData && (
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Step 1: Map Columns — {uploadData.name}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { k: "date" as const, l: "Date *" },
                  { k: "odometerStart" as const, l: "Start KM *" },
                  { k: "odometerEnd" as const, l: "End KM *" },
                  { k: "from" as const, l: "From" },
                  { k: "to" as const, l: "To" },
                  { k: "purpose" as const, l: "Purpose" },
                ].map((f) => (
                  <Field key={f.k} label={f.l}>
                    <select
                      className={selectCls}
                      value={colMap[f.k]}
                      onChange={(e) =>
                        setColMap({ ...colMap, [f.k]: e.target.value })
                      }
                    >
                      <option value="">— Select —</option>
                      {uploadData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600"
                  onClick={() => {
                    setUploadStep(0);
                    setUploadData(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white"
                  onClick={processImport}
                >
                  Next: Classify Trips
                </button>
              </div>
            </div>
          )}

          {/* Upload Step 2 — Classify */}
          {uploadStep === 2 && (
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Step 2: Classify {importTrips.length} Trips
                </h3>
                <div className="flex gap-2">
                  {(["Business", "Private", "Mixed"] as const).map((t) => (
                    <button
                      key={t}
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-teal-300"
                      onClick={() => bulkClassify(t)}
                    >
                      All {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <th className="px-2 py-1.5 text-left">Date</th>
                      <th className="px-2 py-1.5 text-left">Route</th>
                      <th className="px-2 py-1.5 text-right">Total KM</th>
                      <th className="px-2 py-1.5 text-center">Type</th>
                      <th className="px-2 py-1.5 text-right">Business</th>
                      <th className="px-2 py-1.5 text-right">Private</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importTrips.map((t, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-2 py-2 font-mono text-xs">
                          {t.date}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {t.from && t.to
                            ? `${t.from} → ${t.to}`
                            : t.from || t.to || "—"}
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-xs text-sky-600">
                          {t.totalDistance.toFixed(1)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <select
                            value={t.tripType}
                            onChange={(e) =>
                              setImportTrips((p) =>
                                p.map((x, j) =>
                                  j === i
                                    ? allocTrip({
                                        ...x,
                                        tripType: e.target
                                          .value as Trip["tripType"],
                                      })
                                    : x,
                                ),
                              )
                            }
                            className="rounded border border-slate-200 px-1.5 py-0.5 text-xs"
                          >
                            <option value="Business">Business</option>
                            <option value="Private">Private</option>
                            <option value="Mixed">Mixed</option>
                          </select>
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-xs text-teal-600">
                          {t.businessKm > 0 ? t.businessKm.toFixed(1) : "—"}
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-xs text-violet-600">
                          {t.privateKm > 0 ? t.privateKm.toFixed(1) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600"
                  onClick={() => setUploadStep(1)}
                >
                  Back
                </button>
                <button
                  className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white"
                  onClick={finaliseImport}
                >
                  Import {importTrips.length} Trips
                </button>
              </div>
            </div>
          )}

          {/* Trip Form Modal */}
          {tripForm && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-5"
              onClick={(e) => {
                if (e.target === e.currentTarget) setTripForm(null);
              }}
            >
              <div className="w-full max-w-lg rounded-xl border border-slate-200/80 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">
                  {editId ? "Edit Trip" : "Log New Trip"}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date *">
                    <input
                      type="date"
                      className={inputCls}
                      value={tripForm.date}
                      onChange={(e) =>
                        setTripForm({ ...tripForm, date: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Trip Type *">
                    <select
                      className={selectCls}
                      value={tripForm.tripType}
                      onChange={(e) =>
                        setTripForm({
                          ...tripForm,
                          tripType: e.target.value as Trip["tripType"],
                        })
                      }
                    >
                      <option value="Business">Business Trip</option>
                      <option value="Private">Private Trip</option>
                      <option value="Mixed">Mixed Trip</option>
                    </select>
                  </Field>
                  <Field label="From">
                    <input
                      className={inputCls}
                      placeholder="e.g. Office, Durban"
                      value={tripForm.from}
                      onChange={(e) =>
                        setTripForm({ ...tripForm, from: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="To">
                    <input
                      className={inputCls}
                      placeholder="e.g. Client, Umhlanga"
                      value={tripForm.to}
                      onChange={(e) =>
                        setTripForm({ ...tripForm, to: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Start Odometer (km) *">
                    <input
                      type="number"
                      className={inputCls}
                      value={tripForm.odometerStart}
                      onChange={(e) =>
                        setTripForm({
                          ...tripForm,
                          odometerStart: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="End Odometer (km) *">
                    <input
                      type="number"
                      className={inputCls}
                      value={tripForm.odometerEnd}
                      onChange={(e) =>
                        setTripForm({
                          ...tripForm,
                          odometerEnd: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Purpose / Notes *">
                      <input
                        className={inputCls}
                        value={tripForm.purpose}
                        onChange={(e) =>
                          setTripForm({
                            ...tripForm,
                            purpose: e.target.value,
                          })
                        }
                        placeholder="e.g. Client meeting — annual audit"
                      />
                    </Field>
                  </div>
                  {tripForm.tripType === "Mixed" && (
                    <div className="col-span-2 rounded-lg bg-slate-50 p-3">
                      <div className="mb-2 text-sm font-semibold text-amber-600">
                        Business Portion: {tripForm.mixedSplit}%
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={tripForm.mixedSplit}
                        onChange={(e) =>
                          setTripForm({
                            ...tripForm,
                            mixedSplit: parseInt(e.target.value),
                          })
                        }
                        className="w-full accent-teal-600"
                      />
                      {parseFloat(String(tripForm.odometerEnd)) >
                        parseFloat(String(tripForm.odometerStart)) && (
                        <div className="mt-1.5 flex justify-between text-xs">
                          <span className="text-teal-600">
                            Business:{" "}
                            {(
                              ((parseFloat(String(tripForm.odometerEnd)) -
                                parseFloat(String(tripForm.odometerStart))) *
                                tripForm.mixedSplit) /
                              100
                            ).toFixed(1)}{" "}
                            km
                          </span>
                          <span className="text-violet-600">
                            Private:{" "}
                            {(
                              ((parseFloat(String(tripForm.odometerEnd)) -
                                parseFloat(String(tripForm.odometerStart))) *
                                (100 - tripForm.mixedSplit)) /
                              100
                            ).toFixed(1)}{" "}
                            km
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600"
                    onClick={() => {
                      setTripForm(null);
                      setEditId(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white"
                    onClick={saveTrip}
                  >
                    {editId ? "Update" : "Save Trip"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Trip Table */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Trip Log</h3>
            <select
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="all">All Months</option>
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {filteredTrips.length === 0 ? (
            <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
              <p className="text-slate-400">
                No trips yet. Add a trip or upload CSV.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Route</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-center">Type</th>
                    <th className="px-3 py-2 text-right">Business</th>
                    <th className="px-3 py-2 text-right">Private</th>
                    <th className="px-3 py-2 text-left">Purpose</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrips.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs">
                        {t.date}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {t.from && t.to
                          ? `${t.from} → ${t.to}`
                          : t.from || t.to || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-sky-600">
                        {t.totalDistance.toFixed(1)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <select
                          value={t.tripType}
                          onChange={(e) =>
                            changeTripType(
                              t.id,
                              e.target.value as Trip["tripType"],
                            )
                          }
                          className={`rounded border px-1.5 py-0.5 text-xs font-semibold ${
                            t.tripType === "Business"
                              ? "border-teal-200 text-teal-700"
                              : t.tripType === "Private"
                                ? "border-violet-200 text-violet-700"
                                : "border-amber-200 text-amber-700"
                          }`}
                        >
                          <option value="Business">Business</option>
                          <option value="Private">Private</option>
                          <option value="Mixed">Mixed</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-teal-600">
                        {t.businessKm > 0 ? t.businessKm.toFixed(1) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-violet-600">
                        {t.privateKm > 0 ? t.privateKm.toFixed(1) : "—"}
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-2.5 text-xs text-slate-500">
                        {t.purpose || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <button
                          onClick={() => {
                            setTripForm({ ...t });
                            setEditId(t.id);
                          }}
                          className="mr-1 text-slate-400 hover:text-teal-600"
                          title="Edit"
                        >
                          &#9998;
                        </button>
                        <button
                          onClick={() =>
                            setTrips((p) => p.filter((x) => x.id !== t.id))
                          }
                          className="text-slate-400 hover:text-red-500"
                          title="Delete"
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Running Totals */}
                  <tr className="bg-slate-50 font-semibold">
                    <td colSpan={2} className="px-3 py-2.5 text-xs text-teal-700">
                      TOTALS
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-sky-600">
                      {fmtKm(
                        filteredTrips.reduce(
                          (s, t) => s + t.totalDistance,
                          0,
                        ),
                      )}
                    </td>
                    <td></td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-teal-600">
                      {fmtKm(
                        filteredTrips.reduce(
                          (s, t) => s + t.businessKm,
                          0,
                        ),
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-violet-600">
                      {fmtKm(
                        filteredTrips.reduce(
                          (s, t) => s + t.privateKm,
                          0,
                        ),
                      )}
                    </td>
                    <td></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Year-End Section */}
          <div className="space-y-4 pt-2">
            <h3 className="text-base font-semibold text-slate-900">
              Year-End Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vehicle Description">
                <input
                  className={inputCls}
                  value={vehicleName}
                  onChange={(e) => setVehicleName(e.target.value)}
                  placeholder="e.g. Toyota Corolla 1.8"
                />
              </Field>
              <Field label="Determined Value (R)">
                <input
                  type="number"
                  className={inputCls}
                  value={vehicleValue}
                  onChange={(e) => setVehicleValue(e.target.value)}
                  placeholder="e.g. 350000"
                />
              </Field>
            </div>

            {/* Monthly Chart */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex h-28 items-end gap-1">
                {monthlyData.map((d, i) => {
                  const t = d.biz + d.priv;
                  const h = t > 0 ? (t / maxMon) * 100 : 2;
                  const bh = t > 0 ? (d.biz / t) * h : 0;
                  return (
                    <div
                      key={i}
                      className="flex flex-1 flex-col items-center gap-0.5"
                    >
                      <div
                        className="flex w-full max-w-[28px] flex-col justify-end overflow-hidden rounded-t"
                        style={{ height: h }}
                      >
                        {h - bh > 0 && (
                          <div
                            className="bg-violet-500"
                            style={{ height: h - bh }}
                          />
                        )}
                        {bh > 0 && (
                          <div
                            className="bg-teal-500"
                            style={{ height: bh }}
                          />
                        )}
                        {t === 0 && (
                          <div className="h-0.5 bg-slate-200" />
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400">
                        {MONTHS[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-center gap-4 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm bg-teal-500" />{" "}
                  Business
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm bg-violet-500" />{" "}
                  Private
                </span>
              </div>
            </div>

            {vVal > 0 && (
              <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <h4 className="mb-3 text-sm font-semibold text-slate-900">
                  SARS Deemed Cost
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <ResultCard
                    label="Fixed Cost (annual)"
                    value={fmt(deemedFixed)}
                    colorClass="text-slate-700"
                    sub={`${fmt(sRate.fixed)}/month`}
                  />
                  <ResultCard
                    label="Fuel Cost"
                    value={fmt(deemedFuel)}
                    colorClass="text-slate-700"
                    sub={`R${sRate.fuel}/km x ${fmtKm(tripStats.totalKm)}`}
                  />
                  <ResultCard
                    label="Maintenance Cost"
                    value={fmt(deemedMaint)}
                    colorClass="text-slate-700"
                    sub={`R${sRate.maint}/km x ${fmtKm(tripStats.totalKm)}`}
                  />
                  <ResultCard
                    label="Total Deemed Cost"
                    value={fmt(deemedTotal)}
                    colorClass="text-slate-700"
                  />
                </div>
                <Highlight
                  label="ALLOWABLE DEDUCTION (ITR12)"
                  value={fmt(travelDeduction)}
                />
                <p className="mt-2 text-center text-xs text-slate-400">
                  {fmt(deemedTotal)} x {pct(bizPct)} business use
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════ MEDICAL CREDITS ════════ */}
      {tab === "medical" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Medical Tax Credits
            </h2>
            <p className="text-sm text-slate-500">
              Section 6A (fees credit) &amp; Section 6B (additional expenses
              credit)
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Number of Dependants (incl. main member)">
                <input
                  type="number"
                  min="1"
                  className={inputCls}
                  value={med.dependants}
                  onChange={(e) =>
                    setMed({ ...med, dependants: parseInt(e.target.value) || 1 })
                  }
                />
              </Field>
              <Field label="Monthly Medical Aid Contribution (R)">
                <input
                  type="number"
                  className={inputCls}
                  value={med.monthlyContrib}
                  onChange={(e) =>
                    setMed({ ...med, monthlyContrib: e.target.value })
                  }
                />
              </Field>
              <Field label="Out-of-Pocket Medical Expenses (R/year)">
                <input
                  type="number"
                  className={inputCls}
                  value={med.outOfPocket}
                  onChange={(e) =>
                    setMed({ ...med, outOfPocket: e.target.value })
                  }
                />
              </Field>
              <Field label="Taxable Income (R)">
                <input
                  type="number"
                  className={inputCls}
                  value={med.taxableIncome}
                  onChange={(e) =>
                    setMed({ ...med, taxableIncome: e.target.value })
                  }
                />
              </Field>
              <Field label="Age Category">
                <select
                  className={selectCls}
                  value={med.age}
                  onChange={(e) => setMed({ ...med, age: e.target.value })}
                >
                  <option value="under65">Under 65</option>
                  <option value="65to74">65 – 74</option>
                  <option value="75plus">75+</option>
                </select>
              </Field>
              <Field label="Disability?">
                <select
                  className={selectCls}
                  value={med.disability ? "yes" : "no"}
                  onChange={(e) =>
                    setMed({ ...med, disability: e.target.value === "yes" })
                  }
                >
                  <option value="no">No</option>
                  <option value="yes">Yes — taxpayer or dependant</option>
                </select>
              </Field>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ResultCard
              label="Section 6A Credit"
              value={fmt(medResult.s6a)}
              colorClass="text-sky-600"
            />
            <ResultCard
              label="Section 6B Credit"
              value={fmt(medResult.s6b)}
              colorClass="text-violet-600"
            />
            <ResultCard
              label="Total Credit"
              value={fmt(medResult.total)}
              colorClass="text-teal-600"
            />
          </div>
          <Highlight
            label="TOTAL MEDICAL TAX CREDITS (ITR12)"
            value={fmt(medResult.total)}
          />
        </div>
      )}

      {/* ════════ RETIREMENT ════════ */}
      {tab === "retirement" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Retirement Contribution Optimizer
            </h2>
            <p className="text-sm text-slate-500">
              27.5% cap / R350,000 annual limit
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Annual Remuneration (R)">
                <input
                  type="number"
                  className={inputCls}
                  value={ret.income}
                  onChange={(e) => setRet({ ...ret, income: e.target.value })}
                />
              </Field>
              <Field label="Employer Contribution (R/month)">
                <input
                  type="number"
                  className={inputCls}
                  value={ret.employerContrib}
                  onChange={(e) =>
                    setRet({ ...ret, employerContrib: e.target.value })
                  }
                />
              </Field>
              <Field label="Employee Contribution (R/month)">
                <input
                  type="number"
                  className={inputCls}
                  value={ret.employeeContrib}
                  onChange={(e) =>
                    setRet({ ...ret, employeeContrib: e.target.value })
                  }
                />
              </Field>
              <Field label="RA Contributions (R/month)">
                <input
                  type="number"
                  className={inputCls}
                  value={ret.raContrib}
                  onChange={(e) =>
                    setRet({ ...ret, raContrib: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field
                label={`Additional RA: R${ret.additionalRA.toLocaleString()}/month`}
              >
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="100"
                  value={ret.additionalRA}
                  onChange={(e) =>
                    setRet({
                      ...ret,
                      additionalRA: parseInt(e.target.value),
                    })
                  }
                  className="w-full accent-teal-600"
                />
              </Field>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ResultCard
              label="Current Annual Contributions"
              value={fmt(retResult.current)}
              colorClass="text-slate-600"
            />
            <ResultCard
              label="Deduction Limit"
              value={fmt(retResult.limit)}
              colorClass="text-sky-600"
              sub="27.5% or R350k"
            />
            <ResultCard
              label="Headroom Available"
              value={fmt(retResult.headroom)}
              colorClass="text-teal-600"
            />
          </div>
          <Highlight
            label={`TAX SAVING FROM R${ret.additionalRA.toLocaleString()}/mo ADDITIONAL RA`}
            value={fmt(retResult.saving)}
          />
          <p className="text-center text-xs text-slate-400">
            Marginal rate: {(retResult.marginal * 100).toFixed(0)}%
          </p>
        </div>
      )}

      {/* ════════ CGT ════════ */}
      {tab === "cgt" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Capital Gains Tax
            </h2>
            <p className="text-sm text-slate-500">
              Calculate CGT on disposal of assets
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Asset Type">
                <select
                  className={selectCls}
                  value={cgt.assetType}
                  onChange={(e) =>
                    setCgt({ ...cgt, assetType: e.target.value })
                  }
                >
                  {[
                    "Primary residence",
                    "Other property",
                    "Listed shares",
                    "Unlisted shares",
                    "Cryptocurrency",
                    "Other",
                  ].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </Field>
              <Field label="Taxable Income (R) — for marginal rate">
                <input
                  type="number"
                  className={inputCls}
                  value={cgt.taxableIncome}
                  onChange={(e) =>
                    setCgt({ ...cgt, taxableIncome: e.target.value })
                  }
                />
              </Field>
              <Field label="Proceeds / Selling Price (R)">
                <input
                  type="number"
                  className={inputCls}
                  value={cgt.proceeds}
                  onChange={(e) =>
                    setCgt({ ...cgt, proceeds: e.target.value })
                  }
                />
              </Field>
              <Field label="Base Cost / Purchase Price (R)">
                <input
                  type="number"
                  className={inputCls}
                  value={cgt.baseCost}
                  onChange={(e) =>
                    setCgt({ ...cgt, baseCost: e.target.value })
                  }
                />
              </Field>
              <Field label="Improvement Costs (R)">
                <input
                  type="number"
                  className={inputCls}
                  value={cgt.improvements}
                  onChange={(e) =>
                    setCgt({ ...cgt, improvements: e.target.value })
                  }
                />
              </Field>
              <Field label="Selling Costs (R)">
                <input
                  type="number"
                  className={inputCls}
                  value={cgt.sellingCosts}
                  onChange={(e) =>
                    setCgt({ ...cgt, sellingCosts: e.target.value })
                  }
                />
              </Field>
              <Field label="Primary Residence Exclusion?">
                <select
                  className={selectCls}
                  value={cgt.primaryRes ? "yes" : "no"}
                  onChange={(e) =>
                    setCgt({ ...cgt, primaryRes: e.target.value === "yes" })
                  }
                >
                  <option value="no">No</option>
                  <option value="yes">Yes — R2m exclusion</option>
                </select>
              </Field>
              <Field label="Disposal on Death?">
                <select
                  className={selectCls}
                  value={cgt.death ? "yes" : "no"}
                  onChange={(e) =>
                    setCgt({ ...cgt, death: e.target.value === "yes" })
                  }
                >
                  <option value="no">No — R40k exclusion</option>
                  <option value="yes">Yes — R300k exclusion</option>
                </select>
              </Field>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ResultCard
              label="Capital Gain"
              value={fmt(cgtResult.gain)}
              colorClass={
                cgtResult.gain >= 0 ? "text-sky-600" : "text-red-500"
              }
            />
            <ResultCard
              label="Exclusions Applied"
              value={fmt(cgtResult.exclusion)}
              colorClass="text-slate-600"
            />
            <ResultCard
              label="Net Capital Gain"
              value={fmt(cgtResult.netGain)}
              colorClass="text-amber-600"
            />
            <ResultCard
              label="Taxable Portion (40%)"
              value={fmt(cgtResult.taxableGain)}
              colorClass="text-violet-600"
            />
          </div>
          <Highlight label="CGT PAYABLE" value={fmt(cgtResult.cgtPayable)} />
          <p className="text-center text-xs text-slate-400">
            Effective CGT rate: {cgtResult.effectiveRate.toFixed(2)}% | Marginal
            rate: {(cgtResult.marginal * 100).toFixed(0)}%
          </p>
        </div>
      )}

      {/* ════════ PROVISIONAL TAX ════════ */}
      {tab === "provisional" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Provisional Tax Estimator
            </h2>
            <p className="text-sm text-slate-500">
              IRP6 — P1 and P2 payment estimates with penalty risk
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prior Year Taxable Income (R)">
                <input
                  type="number"
                  className={inputCls}
                  value={prov.priorTaxable}
                  onChange={(e) =>
                    setProv({ ...prov, priorTaxable: e.target.value })
                  }
                />
              </Field>
              <Field label="Prior Year Tax Assessed (R)">
                <input
                  type="number"
                  className={inputCls}
                  value={prov.priorTax}
                  onChange={(e) =>
                    setProv({ ...prov, priorTax: e.target.value })
                  }
                />
              </Field>
              <Field label="Estimated Current Year Taxable Income (R)">
                <input
                  type="number"
                  className={inputCls}
                  value={prov.estimatedTaxable}
                  onChange={(e) =>
                    setProv({ ...prov, estimatedTaxable: e.target.value })
                  }
                />
              </Field>
              <Field label="PAYE Deducted (R/year)">
                <input
                  type="number"
                  className={inputCls}
                  value={prov.payeDeducted}
                  onChange={(e) =>
                    setProv({ ...prov, payeDeducted: e.target.value })
                  }
                />
              </Field>
              <Field label="Other Tax Credits (R)">
                <input
                  type="number"
                  className={inputCls}
                  value={prov.credits}
                  onChange={(e) =>
                    setProv({ ...prov, credits: e.target.value })
                  }
                />
              </Field>
              <Field label="Payment Period">
                <select
                  className={selectCls}
                  value={prov.period}
                  onChange={(e) =>
                    setProv({ ...prov, period: e.target.value })
                  }
                >
                  <option value="P1">P1 — First Period (6 months)</option>
                  <option value="P2">P2 — Second Period (year-end)</option>
                </select>
              </Field>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ResultCard
              label="Estimated Tax (full year)"
              value={fmt(provResult.fullTax)}
              colorClass="text-sky-600"
            />
            <ResultCard
              label="Net After Credits"
              value={fmt(provResult.netTax)}
              colorClass="text-violet-600"
            />
            <ResultCard
              label="Safe Harbour Minimum"
              value={fmt(provResult.safeHarbour)}
              colorClass="text-slate-600"
            />
          </div>
          <Highlight
            label={`${prov.period} PAYMENT DUE`}
            value={fmt(provResult.payment)}
          />
          <div className="flex justify-center">
            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                provResult.risk === "green"
                  ? "bg-teal-100 text-teal-800"
                  : provResult.risk === "amber"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              {provResult.risk === "green"
                ? "Low Penalty Risk"
                : provResult.risk === "amber"
                  ? "Marginal — Review Estimate"
                  : "High Penalty Risk — Increase Payment"}
            </span>
          </div>
        </div>
      )}

      {/* ════════ RENTAL INCOME ════════ */}
      {tab === "rental" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Rental Income Worksheet
            </h2>
            <p className="text-sm text-slate-500">
              Calculate net rental income/loss for ITR12
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-teal-700">
                Income
              </h3>
              <div className="space-y-3">
                <Field label="Monthly Rent (R)">
                  <input
                    type="number"
                    className={inputCls}
                    value={rent.grossRent}
                    onChange={(e) =>
                      setRent({ ...rent, grossRent: e.target.value })
                    }
                  />
                </Field>
                <Field label="Months Let">
                  <input
                    type="number"
                    className={inputCls}
                    value={rent.months}
                    onChange={(e) =>
                      setRent({
                        ...rent,
                        months: parseInt(e.target.value) || 12,
                      })
                    }
                  />
                </Field>
                <Field label="Other Income (R)">
                  <input
                    type="number"
                    className={inputCls}
                    value={rent.otherIncome}
                    onChange={(e) =>
                      setRent({ ...rent, otherIncome: e.target.value })
                    }
                  />
                </Field>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-red-600">
                Expenses (R/year)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["rates", "Rates & Taxes"],
                    ["levies", "Levies"],
                    ["insurance", "Insurance"],
                    ["bondInterest", "Bond Interest"],
                    ["repairs", "Repairs"],
                    ["agentFees", "Agent Fees"],
                    ["advertising", "Advertising"],
                    ["security", "Security"],
                    ["garden", "Garden/Pool"],
                    ["utilities", "Utilities"],
                    ["wearTear", "Wear & Tear"],
                    ["legal", "Legal"],
                    ["travelToProperty", "Travel"],
                  ] as const
                ).map(([k, l]) => (
                  <Field key={k} label={l}>
                    <input
                      type="number"
                      className={inputCls}
                      value={rent[k]}
                      onChange={(e) =>
                        setRent({ ...rent, [k]: e.target.value })
                      }
                    />
                  </Field>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ResultCard
              label="Total Income"
              value={fmt(rentalResult.totalInc)}
              colorClass="text-teal-600"
            />
            <ResultCard
              label="Total Expenses"
              value={fmt(rentalResult.expenses)}
              colorClass="text-red-500"
            />
            <ResultCard
              label="Net Rental Income"
              value={fmt(rentalResult.net)}
              colorClass={
                rentalResult.net >= 0 ? "text-teal-600" : "text-red-500"
              }
            />
          </div>
          <Highlight
            label="NET RENTAL INCOME FOR ITR12"
            value={fmt(rentalResult.net)}
          />
        </div>
      )}

      {/* ════════ HOME OFFICE ════════ */}
      {tab === "homeoffice" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Home Office Deduction
            </h2>
            <p className="text-sm text-slate-500">
              Calculate allowable home office deduction
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Employment Type">
                <select
                  className={selectCls}
                  value={ho.empType}
                  onChange={(e) => setHo({ ...ho, empType: e.target.value })}
                >
                  <option value="commission">
                    Commission Earner (50%+)
                  </option>
                  <option value="selfemployed">Self-Employed</option>
                  <option value="salaried">Salaried Employee</option>
                </select>
              </Field>
              <div />
              <Field label="Total Home Area (m²)">
                <input
                  type="number"
                  className={inputCls}
                  value={ho.totalArea}
                  onChange={(e) =>
                    setHo({ ...ho, totalArea: e.target.value })
                  }
                />
              </Field>
              <Field label="Dedicated Office Area (m²)">
                <input
                  type="number"
                  className={inputCls}
                  value={ho.officeArea}
                  onChange={(e) =>
                    setHo({ ...ho, officeArea: e.target.value })
                  }
                />
              </Field>
              <Field label="Rent or Bond Interest (R/month)">
                <input
                  type="number"
                  className={inputCls}
                  value={ho.rentOrInterest}
                  onChange={(e) =>
                    setHo({ ...ho, rentOrInterest: e.target.value })
                  }
                />
              </Field>
              <Field label="Rates (R/month)">
                <input
                  type="number"
                  className={inputCls}
                  value={ho.rates}
                  onChange={(e) => setHo({ ...ho, rates: e.target.value })}
                />
              </Field>
              <Field label="Electricity (R/month)">
                <input
                  type="number"
                  className={inputCls}
                  value={ho.electricity}
                  onChange={(e) =>
                    setHo({ ...ho, electricity: e.target.value })
                  }
                />
              </Field>
              <Field label="Cleaning (R/month)">
                <input
                  type="number"
                  className={inputCls}
                  value={ho.cleaning}
                  onChange={(e) =>
                    setHo({ ...ho, cleaning: e.target.value })
                  }
                />
              </Field>
              <Field label="Office Repairs (R/month)">
                <input
                  type="number"
                  className={inputCls}
                  value={ho.repairs}
                  onChange={(e) =>
                    setHo({ ...ho, repairs: e.target.value })
                  }
                />
              </Field>
              <Field label="Internet / Phone — work portion (R/month)">
                <input
                  type="number"
                  className={inputCls}
                  value={ho.internet}
                  onChange={(e) =>
                    setHo({ ...ho, internet: e.target.value })
                  }
                />
              </Field>
            </div>
          </div>
          {ho.empType === "salaried" && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="text-sm font-semibold text-red-700">
                Salaried Employee Warning
              </div>
              <p className="mt-1 text-sm text-slate-600">
                SARS very rarely allows home office deductions for salaried
                employees. You must perform duties mainly (50%+) at home and
                have no alternative office provided by your employer. The
                office must be specifically equipped and used exclusively for
                work.
              </p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <ResultCard
              label="Office Ratio"
              value={pct(hoResult.ratio * 100)}
              colorClass="text-sky-600"
              sub={`${ho.officeArea || 0}m² of ${ho.totalArea || 0}m²`}
            />
            <ResultCard
              label="Monthly Deduction"
              value={fmt(hoResult.monthly)}
              colorClass="text-violet-600"
            />
            <ResultCard
              label="Qualification"
              value={hoResult.qualifies ? "Qualifies" : "Unlikely"}
              colorClass={
                hoResult.qualifies ? "text-teal-600" : "text-red-500"
              }
            />
          </div>
          <Highlight
            label="ANNUAL HOME OFFICE DEDUCTION"
            value={fmt(hoResult.qualifies ? hoResult.annual : 0)}
          />
        </div>
      )}
    </div>
  );
}
