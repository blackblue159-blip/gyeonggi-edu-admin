import { useCallback, useEffect, useMemo, useState } from "react";
import { SpineTableDocument } from "../components/ExpenseVoucherOutput.jsx";

const STORAGE_LEDGER = "gyeonggi.archive.ledger.v1";
const STORAGE_EXPENSE = "gyeonggi.archive.expense.v1";

/** @type {string[]} 단위과제 시트 기반 입력 힌트 */
const UNIT_TASK_SUGGESTIONS = [
  "개인정보보호",
  "계약사무관리",
  "공유재산물품관리",
  "교육행정서무관리",
  "교직원인사발령관리",
  "교직원후생복지지원",
  "방과후학교교육활동",
  "보안비밀관리",
  "특수교과교육활동",
  "학교시설물관리",
  "학교안전예방보상관리",
];

function newId() {
  return crypto.randomUUID();
}

function defaultLedgerRow() {
  return {
    id: newId(),
    boxNumber: "",
    prodStart: "",
    prodEnd: "",
    dept: "",
    taskCard: "",
    recordFolder: "",
    unitTask: "",
    retention: "5년",
    quantity: 1,
    docType: "문서",
    disclosure: "부분공개",
    nonPublicReason: "6호",
    manager: "",
    orgName: "",
  };
}

function defaultExpenseRow() {
  return {
    id: newId(),
    title: "학교회계지출증빙서",
    fiscalYear: "2024회계",
    yearMonth: "2024년 3월",
    period: "~ 11일(553)",
    serialLabel: "5책중1책",
    orgName: "은가람중학교",
    widthCm: 3,
  };
}

function migrateExpenseRow(r) {
  if (!r || typeof r !== "object") return { ...defaultExpenseRow(), id: newId() };
  const id = typeof r.id === "string" ? r.id : newId();
  const widthCm = Number(r.widthCm);
  const w = Number.isFinite(widthCm) && widthCm > 0 ? widthCm : 3;

  const needsLegacyMigration =
    !("yearMonth" in r) &&
    (r.yearLabel !== undefined ||
      r.monthLabel !== undefined ||
      r.startDate !== undefined ||
      r.endDate !== undefined ||
      r.no !== undefined);

  let yearMonth = String(r.yearMonth ?? "");
  let period = String(r.period ?? "");

  if (needsLegacyMigration) {
    yearMonth = [r.yearLabel, r.monthLabel].filter((s) => String(s ?? "").trim()).join(" ");
    if (!period.trim() && (r.startDate != null || r.endDate != null)) {
      period = `${String(r.startDate ?? "").trim()} ~ ${String(r.endDate ?? "").trim()}`.trim();
    }
  }

  return {
    id,
    title: String(r.title ?? ""),
    fiscalYear: String(r.fiscalYear ?? ""),
    yearMonth,
    period,
    serialLabel: String(r.serialLabel ?? ""),
    orgName: String(r.orgName ?? ""),
    widthCm: w,
  };
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeLedgerState(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [defaultLedgerRow()];
  return raw.map((r) =>
    r && typeof r === "object"
      ? { ...defaultLedgerRow(), ...r, id: typeof r.id === "string" ? r.id : newId() }
      : defaultLedgerRow()
  );
}

function normalizeExpenseState(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [
      migrateExpenseRow({ ...defaultExpenseRow(), id: newId() }),
      migrateExpenseRow({
        ...defaultExpenseRow(),
        id: newId(),
        serialLabel: "5책중2책",
        period: "11일(554) ~ 17일",
      }),
    ];
  }
  return raw.map((r) => migrateExpenseRow(r));
}

function groupLedgerByBox(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = String(r.boxNumber || "").trim() || "(상자번호 미입력)";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  return map;
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-[#37352f] text-white shadow-sm"
          : "text-[#787774] hover:bg-[#f7f6f3]"
      }`}
    >
      {children}
    </button>
  );
}

function ArchiveCoverPrint({ row, seq }) {
  const line1 = [row.unitTask, row.retention].every((s) => String(s || "").trim())
    ? `${row.unitTask} (${row.retention})`
    : String(row.unitTask || row.taskCard || "").trim() || "—";
  const line2 = String(row.recordFolder || "").trim() || "—";
  const ys = [row.prodStart, row.prodEnd].map((x) => String(x || "").trim()).filter(Boolean);
  const line3 = ys.length ? ys.join("–") : "—";
  const line4 = String(row.orgName || "").trim() || "—";

  return (
    <div className="archive-cover relative box-border min-h-[calc(297mm-32mm)] border border-[#ccc] bg-white print:border-0">
      <div className="absolute top-6 right-8 text-right text-[11px] leading-snug text-[#37352f] print:top-10 print:right-12">
        <div className="whitespace-pre-line font-medium">보존문서{"\n"}관리대장{"\n"}순</div>
        <div className="mt-2 text-2xl font-semibold tabular-nums">{seq}</div>
      </div>
      <div className="flex min-h-[calc(297mm-32mm)] flex-col items-center justify-center px-16 pb-24 pt-20 text-center print:px-20">
        <p className="text-[22px] font-semibold text-[#111] print:text-[24px]">{line1}</p>
        <div className="mt-10" />
        <p className="max-w-[85%] text-[20px] font-medium leading-relaxed text-[#222] print:text-[22px]">{line2}</p>
        <div className="mt-14" />
        <p className="text-[17px] text-[#333] print:text-[19px]">{line3}</p>
        <div className="mt-16" />
        <p className="text-[18px] font-semibold text-[#111] print:text-[20px]">{line4}</p>
      </div>
    </div>
  );
}

function BoxLabelPrint({ boxKey, rows }) {
  const sorted = [...rows].sort((a, b) => String(a.recordFolder || "").localeCompare(String(b.recordFolder || ""), "ko"));
  const dept0 = String(sorted[0]?.dept || "").trim() || "—";

  return (
    <div className="label-sheet box-border flex h-[85mm] w-[85mm] flex-col bg-white p-[3mm] text-[9px] leading-tight text-[#111] print:h-[85mm] print:w-[85mm]">
      <div className="border-b border-[#333] pb-0.5 font-semibold">상자번호</div>
      <div className="mb-1 text-[11px] font-bold">{boxKey}</div>
      <div className="border-b border-[#333] pb-0.5 font-semibold">생산부서</div>
      <div className="mb-1 text-[10px]">{dept0}</div>
      <table className="w-full border-collapse border border-[#333] text-[8px]">
        <thead>
          <tr className="bg-[#f5f5f5]">
            <th className="border border-[#333] px-0.5 py-0.5 font-semibold">순</th>
            <th className="border border-[#333] px-0.5 py-0.5 font-semibold">생산</th>
            <th className="border border-[#333] px-0.5 py-0.5 font-semibold">종료</th>
            <th className="border border-[#333] px-0.5 py-0.5 font-semibold">기록물철명</th>
            <th className="border border-[#333] px-0.5 py-0.5 font-semibold">보존</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={r.id}>
              <td className="border border-[#333] px-0.5 py-0.5 text-center tabular-nums">{i + 1}</td>
              <td className="border border-[#333] px-0.5 py-0.5 text-center">{r.prodStart ?? ""}</td>
              <td className="border border-[#333] px-0.5 py-0.5 text-center">{r.prodEnd ?? ""}</td>
              <td className="border border-[#333] px-0.5 py-0.5">{r.recordFolder || "—"}</td>
              <td className="border border-[#333] px-0.5 py-0.5 text-center whitespace-nowrap">{r.retention || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-auto pt-1 text-[7px] text-[#666]">아이라벨 823 등 85mm×85mm 권장</p>
    </div>
  );
}

export default function Archive() {
  const [tab, setTab] = useState("preserve");
  const [ledger, setLedger] = useState(() => normalizeLedgerState(loadJson(STORAGE_LEDGER, null)));
  const [expenseRows, setExpenseRows] = useState(() => normalizeExpenseState(loadJson(STORAGE_EXPENSE, null)));

  useEffect(() => {
    localStorage.setItem(STORAGE_LEDGER, JSON.stringify(ledger));
  }, [ledger]);

  useEffect(() => {
    localStorage.setItem(STORAGE_EXPENSE, JSON.stringify(expenseRows));
  }, [expenseRows]);

  const ledgerWithSeq = useMemo(() => ledger.map((r, i) => ({ row: r, seq: i + 1 })), [ledger]);

  const addLedgerRow = useCallback(() => {
    setLedger((prev) => [...prev, defaultLedgerRow()]);
  }, []);

  const removeLedgerRow = useCallback((id) => {
    setLedger((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }, []);

  const updateLedger = useCallback((id, patch) => {
    setLedger((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const addExpenseRow = useCallback(() => {
    setExpenseRows((prev) => [...prev, { ...defaultExpenseRow(), id: newId(), serialLabel: "", period: "" }]);
  }, []);

  const removeExpenseRow = useCallback((id) => {
    setExpenseRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }, []);

  const updateExpense = useCallback((id, patch) => {
    setExpenseRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const printCovers = useCallback(() => {
    document.body.classList.add("archive-printing-covers");
    const handleAfter = () => {
      document.body.classList.remove("archive-printing-covers");
      window.removeEventListener("afterprint", handleAfter);
    };
    window.addEventListener("afterprint", handleAfter);
    window.print();
  }, []);

  const printLabels = useCallback(() => {
    const s = document.createElement("style");
    s.id = "archive-dynamic-print-page";
    s.textContent = "@page { size: 85mm 85mm; margin: 0; }";
    document.head.appendChild(s);
    document.body.classList.add("archive-printing-labels");
    const handleAfter = () => {
      document.body.classList.remove("archive-printing-labels");
      document.getElementById("archive-dynamic-print-page")?.remove();
      window.removeEventListener("afterprint", handleAfter);
    };
    window.addEventListener("afterprint", handleAfter);
    window.print();
  }, []);

  const printExpense = useCallback(() => {
    const s = document.createElement("style");
    s.id = "archive-dynamic-print-page";
    s.textContent = "@page { size: A4 landscape; margin: 1cm; }";
    document.head.appendChild(s);
    document.body.classList.add("archive-printing-expense");
    const handleAfter = () => {
      document.body.classList.remove("archive-printing-expense");
      document.getElementById("archive-dynamic-print-page")?.remove();
      window.removeEventListener("afterprint", handleAfter);
    };
    window.addEventListener("afterprint", handleAfter);
    window.print();
  }, []);

  const boxGroups = useMemo(() => groupLedgerByBox(ledger), [ledger]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <style>{`
        @media screen {
          .archive-print-bundle { display: none !important; }
        }
        @media print {
          .no-print { display: none !important; }
          .screen-root { display: none !important; }
          .archive-print-bundle { display: none !important; }
          body.archive-printing-covers .archive-print-bundle.print-covers { display: block !important; }
          body.archive-printing-labels .archive-print-bundle.print-labels { display: block !important; }
          body.archive-printing-expense .archive-print-bundle.print-expense { display: block !important; }
          body.archive-printing-expense {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        @page { size: A4; margin: 12mm; }
        .print-labels-stack .label-page { page-break-after: always; }
        .print-labels-stack .label-page:last-child { page-break-after: auto; }
        .spine-doc-print table { break-inside: avoid; page-break-inside: avoid; }
      `}</style>

      <div className="screen-root">
        <header className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#787774]">문서 보존</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#37352f]">보존문서</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#787774]">
            보존문서관리대장·표지·보존상자 라벨(85mm×85mm)과 편철 옆면 표지를 브라우저에서 입력·인쇄합니다. 데이터는 이 기기의
            localStorage에만 저장됩니다.
          </p>
        </header>

        <div className="no-print mb-6 flex flex-wrap gap-2 border-b border-[#e9e9e7] pb-4">
          <TabButton active={tab === "preserve"} onClick={() => setTab("preserve")}>
            보존문서 관리
          </TabButton>
          <TabButton active={tab === "expense"} onClick={() => setTab("expense")}>
            편철 표지
          </TabButton>
        </div>

        {tab === "preserve" ? (
          <section className="space-y-8">
            <div className="rounded-xl border border-[#e9e9e7] bg-[#fbfbfa] p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#37352f]">보존문서관리대장</h2>
                  <p className="mt-1 text-xs text-[#787774]">행을 추가·수정한 뒤 표지 또는 라벨을 인쇄할 수 있습니다.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={addLedgerRow}
                    className="rounded-md border border-[#e9e9e7] bg-white px-3 py-2 text-xs font-medium text-[#37352f] shadow-sm hover:bg-[#f7f6f3]"
                  >
                    행 추가
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border border-[#e9e9e7] bg-white">
                <table className="min-w-[1100px] w-full border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-[#e9e9e7] bg-[#f7f6f3] text-[#5c5b57]">
                      <th className="px-2 py-2 font-medium">순</th>
                      <th className="px-2 py-2 font-medium">상자번호</th>
                      <th className="px-2 py-2 font-medium">생산(시작)</th>
                      <th className="px-2 py-2 font-medium">생산(종료)</th>
                      <th className="px-2 py-2 font-medium">생산부서</th>
                      <th className="px-2 py-2 font-medium">과제카드명</th>
                      <th className="px-2 py-2 font-medium">세부 기록물철명</th>
                      <th className="px-2 py-2 font-medium">단위과제명</th>
                      <th className="px-2 py-2 font-medium">보존</th>
                      <th className="px-2 py-2 font-medium">수량</th>
                      <th className="px-2 py-2 font-medium">문서유형</th>
                      <th className="px-2 py-2 font-medium">공개</th>
                      <th className="px-2 py-2 font-medium">비공개사유</th>
                      <th className="px-2 py-2 font-medium">담당자</th>
                      <th className="px-2 py-2 font-medium">표지 기관명</th>
                      <th className="px-2 py-2 font-medium w-16">삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerWithSeq.map(({ row, seq }) => (
                      <tr key={row.id} className="border-b border-[#f0f0ef]">
                        <td className="px-2 py-1.5 tabular-nums text-[#787774]">{seq}</td>
                        <td className="p-0">
                          <input
                            className="w-full min-w-[120px] border-0 bg-transparent px-2 py-1.5 text-[11px] outline-none focus:bg-[#f7f6f3]"
                            value={row.boxNumber}
                            onChange={(e) => updateLedger(row.id, { boxNumber: e.target.value })}
                            placeholder="행정실3-2025-01"
                          />
                        </td>
                        <td className="p-0">
                          <input
                            type="number"
                            className="w-16 border-0 bg-transparent px-2 py-1.5 text-[11px] outline-none focus:bg-[#f7f6f3]"
                            value={row.prodStart}
                            onChange={(e) => updateLedger(row.id, { prodStart: e.target.value })}
                          />
                        </td>
                        <td className="p-0">
                          <input
                            type="number"
                            className="w-16 border-0 bg-transparent px-2 py-1.5 text-[11px] outline-none focus:bg-[#f7f6f3]"
                            value={row.prodEnd}
                            onChange={(e) => updateLedger(row.id, { prodEnd: e.target.value })}
                          />
                        </td>
                        <td className="p-0">
                          <input
                            className="w-full min-w-[72px] border-0 bg-transparent px-2 py-1.5 text-[11px] outline-none focus:bg-[#f7f6f3]"
                            value={row.dept}
                            onChange={(e) => updateLedger(row.id, { dept: e.target.value })}
                          />
                        </td>
                        <td className="p-0">
                          <input
                            className="w-full min-w-[100px] border-0 bg-transparent px-2 py-1.5 text-[11px] outline-none focus:bg-[#f7f6f3]"
                            value={row.taskCard}
                            onChange={(e) => updateLedger(row.id, { taskCard: e.target.value })}
                            list="unit-task-list"
                          />
                        </td>
                        <td className="p-0">
                          <input
                            className="w-full min-w-[140px] border-0 bg-transparent px-2 py-1.5 text-[11px] outline-none focus:bg-[#f7f6f3]"
                            value={row.recordFolder}
                            onChange={(e) => updateLedger(row.id, { recordFolder: e.target.value })}
                          />
                        </td>
                        <td className="p-0">
                          <input
                            className="w-full min-w-[100px] border-0 bg-transparent px-2 py-1.5 text-[11px] outline-none focus:bg-[#f7f6f3]"
                            value={row.unitTask}
                            onChange={(e) => updateLedger(row.id, { unitTask: e.target.value })}
                            list="unit-task-list"
                          />
                        </td>
                        <td className="p-0">
                          <input
                            className="w-14 border-0 bg-transparent px-2 py-1.5 text-[11px] outline-none focus:bg-[#f7f6f3]"
                            value={row.retention}
                            onChange={(e) => updateLedger(row.id, { retention: e.target.value })}
                          />
                        </td>
                        <td className="p-0">
                          <input
                            type="number"
                            className="w-12 border-0 bg-transparent px-2 py-1.5 text-[11px] outline-none focus:bg-[#f7f6f3]"
                            value={row.quantity}
                            onChange={(e) => updateLedger(row.id, { quantity: Number(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="p-0">
                          <input
                            className="w-14 border-0 bg-transparent px-2 py-1.5 text-[11px] outline-none focus:bg-[#f7f6f3]"
                            value={row.docType}
                            onChange={(e) => updateLedger(row.id, { docType: e.target.value })}
                          />
                        </td>
                        <td className="p-0">
                          <input
                            className="w-20 border-0 bg-transparent px-2 py-1.5 text-[11px] outline-none focus:bg-[#f7f6f3]"
                            value={row.disclosure}
                            onChange={(e) => updateLedger(row.id, { disclosure: e.target.value })}
                          />
                        </td>
                        <td className="p-0">
                          <input
                            className="w-16 border-0 bg-transparent px-2 py-1.5 text-[11px] outline-none focus:bg-[#f7f6f3]"
                            value={row.nonPublicReason}
                            onChange={(e) => updateLedger(row.id, { nonPublicReason: e.target.value })}
                          />
                        </td>
                        <td className="p-0">
                          <input
                            className="w-20 border-0 bg-transparent px-2 py-1.5 text-[11px] outline-none focus:bg-[#f7f6f3]"
                            value={row.manager}
                            onChange={(e) => updateLedger(row.id, { manager: e.target.value })}
                          />
                        </td>
                        <td className="p-0">
                          <input
                            className="w-full min-w-[80px] border-0 bg-transparent px-2 py-1.5 text-[11px] outline-none focus:bg-[#f7f6f3]"
                            value={row.orgName}
                            onChange={(e) => updateLedger(row.id, { orgName: e.target.value })}
                            placeholder="OO학교"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <button
                            type="button"
                            onClick={() => removeLedgerRow(row.id)}
                            className="rounded border border-[#e9e9e7] bg-white px-2 py-0.5 text-[10px] text-[#787774] hover:bg-[#fff5f5] hover:text-[#b91c1c]"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <datalist id="unit-task-list">
                {UNIT_TASK_SUGGESTIONS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-[#e9e9e7] bg-white p-4 shadow-[0_1px_2px_rgba(15,15,15,0.04)] sm:p-5">
                <h3 className="text-sm font-semibold text-[#37352f]">보존문서표지 인쇄</h3>
                <p className="mt-1 text-xs text-[#787774]">대장의 각 행마다 A4 표지 한 장이 이어집니다. 순번은 대장의 순과 같습니다.</p>
                <button
                  type="button"
                  onClick={printCovers}
                  className="mt-4 rounded-md bg-[#2383e2] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1a6ec4]"
                >
                  표지 인쇄
                </button>
              </div>
              <div className="rounded-xl border border-[#e9e9e7] bg-white p-4 shadow-[0_1px_2px_rgba(15,15,15,0.04)] sm:p-5">
                <h3 className="text-sm font-semibold text-[#37352f]">보존상자 라벨 (85mm×85mm)</h3>
                <p className="mt-1 text-xs text-[#787774]">
                  상자번호가 같은 행끼리 한 장의 라벨로 묶입니다. 상자번호를 비우면 &quot;(상자번호 미입력)&quot; 그룹으로 묶입니다.
                </p>
                <p className="mt-2 text-xs text-[#5c5b57]">그룹 수: {boxGroups.size}개</p>
                <button
                  type="button"
                  onClick={printLabels}
                  className="mt-4 rounded-md border border-[#e9e9e7] bg-[#f7f6f3] px-4 py-2 text-sm font-medium text-[#37352f] hover:bg-[#ececea]"
                >
                  라벨 인쇄
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-[#e9e9e7] bg-[#fbfbfa] p-4 text-xs text-[#787774]">
              <p className="font-medium text-[#37352f]">미리보기 (화면)</p>
              <p className="mt-1">인쇄 전 레이아웃을 확인하려면 아래 영역을 스크롤하세요. 실제 인쇄는 인쇄 대화상자에서 여백을 조정할 수 있습니다.</p>
            </div>

            <div className="space-y-6 rounded-xl border border-[#e9e9e7] bg-[#f7f6f3]/50 p-4">
              <p className="text-xs font-medium text-[#5c5b57]">표지 미리보기 (첫 2건)</p>
              <div className="space-y-4">
                {ledgerWithSeq.slice(0, 2).map(({ row, seq }) => (
                  <div key={row.id} className="origin-top scale-[0.55] shadow-md sm:scale-[0.65]" style={{ transformOrigin: "top left" }}>
                    <div className="w-[210mm]">
                      <ArchiveCoverPrint row={row} seq={seq} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs font-medium text-[#5c5b57]">라벨 미리보기 (첫 2상자)</p>
              <div className="flex flex-wrap gap-4">
                {[...boxGroups.entries()].slice(0, 2).map(([boxKey, rows]) => (
                  <div key={boxKey} className="origin-top scale-[0.9] shadow-md">
                    <BoxLabelPrint boxKey={boxKey} rows={rows} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#37352f]">편철 옆면 표지</h2>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#787774]">
                  문서 편철 시 옆면에 붙이는 표지를 만듭니다. 카드마다 너비(cm)를 정할 수 있고, 미리보기는 가로로 배치되며 한 줄에
                  들어가지 않으면 자동으로 다음 줄로 넘어갑니다. 인쇄는 A4 가로·여백 1cm입니다.
                </p>
              </div>
              <div className="no-print flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addExpenseRow}
                  className="rounded-md border border-[#e9e9e7] bg-white px-3 py-2 text-xs font-medium text-[#37352f] shadow-sm transition hover:bg-[#f7f6f3]"
                >
                  표지 추가
                </button>
                <button
                  type="button"
                  onClick={printExpense}
                  className="rounded-md bg-[#2383e2] px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-[#1a6ec4]"
                >
                  인쇄
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {expenseRows.map((row, idx) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-[#e9e9e7] bg-white p-4 shadow-[0_1px_2px_rgba(15,15,15,0.04)] sm:p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-2 border-b border-[#f0f0ef] pb-3">
                    <span className="text-[12px] font-semibold text-[#37352f]">표지 {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeExpenseRow(row.id)}
                      className="rounded-md border border-[#e9e9e7] bg-[#fbfbfa] px-2.5 py-1 text-[11px] font-medium text-[#787774] transition hover:border-[#fecaca] hover:bg-[#fff5f5] hover:text-[#b91c1c]"
                    >
                      삭제
                    </button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="block text-[11px] font-medium text-[#787774]">제목</label>
                      <input
                        value={row.title}
                        onChange={(e) => updateExpense(row.id, { title: e.target.value })}
                        className="w-full rounded-md border border-[#e9e9e7] bg-[#fbfbfa] px-3 py-2 text-[13px] text-[#37352f] shadow-inner outline-none transition focus:border-[#2383e2] focus:bg-white focus:ring-2 focus:ring-[#2383e2]/20"
                        placeholder="학교회계지출증빙서"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-[#787774]">회계연도</label>
                      <input
                        value={row.fiscalYear}
                        onChange={(e) => updateExpense(row.id, { fiscalYear: e.target.value })}
                        className="w-full rounded-md border border-[#e9e9e7] bg-[#fbfbfa] px-3 py-2 text-[13px] text-[#37352f] outline-none transition focus:border-[#2383e2] focus:bg-white focus:ring-2 focus:ring-[#2383e2]/20"
                        placeholder="2024회계"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-[#787774]">연월</label>
                      <input
                        value={row.yearMonth}
                        onChange={(e) => updateExpense(row.id, { yearMonth: e.target.value })}
                        className="w-full rounded-md border border-[#e9e9e7] bg-[#fbfbfa] px-3 py-2 text-[13px] text-[#37352f] outline-none transition focus:border-[#2383e2] focus:bg-white focus:ring-2 focus:ring-[#2383e2]/20"
                        placeholder="2024년 3월"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="block text-[11px] font-medium text-[#787774]">기간</label>
                      <input
                        value={row.period}
                        onChange={(e) => updateExpense(row.id, { period: e.target.value })}
                        className="w-full rounded-md border border-[#e9e9e7] bg-[#fbfbfa] px-3 py-2 text-[13px] text-[#37352f] outline-none transition focus:border-[#2383e2] focus:bg-white focus:ring-2 focus:ring-[#2383e2]/20"
                        placeholder="~ 11일(553)"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-[#787774]">일련번호</label>
                      <input
                        value={row.serialLabel}
                        onChange={(e) => updateExpense(row.id, { serialLabel: e.target.value })}
                        className="w-full rounded-md border border-[#e9e9e7] bg-[#fbfbfa] px-3 py-2 text-[13px] text-[#37352f] outline-none transition focus:border-[#2383e2] focus:bg-white focus:ring-2 focus:ring-[#2383e2]/20"
                        placeholder="5책중1책"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-[#787774]">기관명</label>
                      <input
                        value={row.orgName}
                        onChange={(e) => updateExpense(row.id, { orgName: e.target.value })}
                        className="w-full rounded-md border border-[#e9e9e7] bg-[#fbfbfa] px-3 py-2 text-[13px] text-[#37352f] outline-none transition focus:border-[#2383e2] focus:bg-white focus:ring-2 focus:ring-[#2383e2]/20"
                        placeholder="은가람중학교"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="block text-[11px] font-medium text-[#787774]">너비 (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        value={row.widthCm}
                        onChange={(e) => updateExpense(row.id, { widthCm: Number(e.target.value) || 3 })}
                        className="w-full max-w-[8rem] rounded-md border border-[#e9e9e7] bg-[#fbfbfa] px-3 py-2 text-[13px] text-[#37352f] outline-none transition focus:border-[#2383e2] focus:bg-white focus:ring-2 focus:ring-[#2383e2]/20"
                      />
                      <p className="text-[10px] text-[#9b9a97]">기본 3cm. 편철 두께에 맞게 조정하세요.</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-[#e9e9e7] bg-[#fbfbfa] p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-[#37352f]">미리보기</h3>
              <p className="mt-1 text-xs text-[#787774]">
                원본 엑셀과 동일한 9행 구조이며, 5개 열씩 한 페이지에 맞춰집니다. (표지가 6개 이상이면 다음 페이지로 이어집니다.)
              </p>
              <div className="mt-4 rounded-lg border border-[#e9e9e7] bg-white p-4 sm:p-6">
                <div className="overflow-x-auto">
                  <SpineTableDocument rows={expenseRows} forPrint={false} />
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="archive-print-bundle print-covers">
        {ledgerWithSeq.map(({ row, seq }, i) => (
          <div key={row.id} style={i < ledgerWithSeq.length - 1 ? { pageBreakAfter: "always" } : undefined}>
            <ArchiveCoverPrint row={row} seq={seq} />
          </div>
        ))}
      </div>

      <div className="archive-print-bundle print-labels">
        <div className="print-labels-stack">
          {[...boxGroups.entries()].map(([boxKey, rows]) => (
            <div key={boxKey} className="label-page flex justify-center">
              <BoxLabelPrint boxKey={boxKey} rows={rows} />
            </div>
          ))}
        </div>
      </div>

      <div className="archive-print-bundle print-expense">
        <div className="spine-doc-print">
          <SpineTableDocument rows={expenseRows} forPrint />
        </div>
      </div>
    </main>
  );
}
