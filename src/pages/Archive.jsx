import { useCallback, useEffect, useState } from "react";
import { SpineTableDocument } from "../components/ExpenseVoucherOutput.jsx";

const STORAGE_EXPENSE = "gyeonggi.archive.expense.v1";

const SPINE_GRID_INPUT_CLASS =
  "w-full min-w-0 border-0 bg-transparent px-2.5 py-2 text-[13px] text-[#37352f] outline-none transition placeholder:text-[#c4c4c0] focus:bg-[#f7f6f3] focus:ring-2 focus:ring-inset focus:ring-[#2383e2]/25";

function newId() {
  return crypto.randomUUID();
}

/** 1~2월: 전년도 회계, 3~12월: 당해 회계 */
function defaultFiscalYearLabel(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const fiscalYear = m <= 2 ? y - 1 : y;
  return `${fiscalYear}회계`;
}

/** 오늘 기준 "2026년 4월" */
function defaultYearMonthLabel(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return `${y}년 ${m}월`;
}

function defaultExpenseRow(date = new Date()) {
  return {
    id: newId(),
    title: "학교회계 지출증빙서",
    fiscalYear: defaultFiscalYearLabel(date),
    yearMonth: defaultYearMonthLabel(date),
    period: "",
    serialLabel: "",
    orgName: "",
    widthCm: 3.5,
  };
}

function migrateExpenseRow(r) {
  if (!r || typeof r !== "object") return { ...defaultExpenseRow(), id: newId() };
  const id = typeof r.id === "string" ? r.id : newId();
  const widthCm = Number(r.widthCm);
  const w = Number.isFinite(widthCm) && widthCm > 0 ? widthCm : 3.5;

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

function normalizeExpenseState(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    const today = new Date();
    return Array.from({ length: 5 }, () => migrateExpenseRow(defaultExpenseRow(today)));
  }
  return raw.map((r) => migrateExpenseRow(r));
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function chunkRows(rows, size) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out.length ? out : [[]];
}

function effectiveWidthCm(v) {
  const s = String(v ?? "").trim();
  // "1", "1.0", "1cm" 등도 허용
  const n = Number.parseFloat(s.replaceAll(",", ""));
  return Number.isFinite(n) && n > 0 ? n : 3.5;
}

function buildSpinePrintHtml(rows) {
  const pages = chunkRows(rows, 5);

  const cell = (inner, extraClass = "") => `<td class="cell ${extraClass}">${inner}</td>`;
  const row = (cells, extraClass = "") => `<tr class="${extraClass}">${cells.join("")}</tr>`;

  const makeTable = (pageRows) => {
    // 입력한 너비(cm) = 인쇄 시 물리적 열 너비(표 전체 너비 = 열 너비 합, 100%로 늘리지 않음)
    const colStyles = pageRows.map((r) => {
      const w = effectiveWidthCm(r.widthCm);
      return `width:${w}cm;min-width:${w}cm;max-width:${w}cm;`;
    });

    const v = (x) => escapeHtml(x || "\u00a0");
    const serial = (r) => String(r.serialLabel ?? r.serial ?? r.no ?? "").trim() || "\u00a0";

    const mkCells = (render) => {
      const out = [];
      pageRows.forEach((r, i) => {
        out.push(`<td class="cell" style="${colStyles[i]}">${render(r)}</td>`);
        if (i < pageRows.length - 1) {
          out.push(`<td class="cell-gap"></td>`);
        }
      });
      return out;
    };

    return `
      <table>
        <tbody>
          ${row(mkCells(() => `<div class="label">회계연도</div>`), "h-label")}
          ${row(mkCells((r) => `<div class="value">${v(r.fiscalYear)}</div>`), "h-value")}
          ${row(mkCells(() => `<div class="label">연월</div>`), "h-label")}
          ${row(mkCells((r) => `<div class="value">${v(String(r.yearMonth ?? "").trim())}</div>`), "h-value")}
          ${row(mkCells((r) => `<div class="value">${v(String(r.period ?? "").trim())}</div>`), "h-value")}
          ${row(mkCells(() => `<div class="label">일련번호</div>`), "h-label")}
          ${row(mkCells((r) => `<div class="value">${v(serial(r))}</div>`), "h-value")}
          ${row(
            mkCells(
              (r) =>
                `<div class="title">${v(r.title)}</div>`
            ),
            "h-title"
          )}
          ${row(mkCells(() => `<div class="label">기관명</div>`), "h-label")}
          ${row(mkCells((r) => `<div class="value">${v(r.orgName)}</div>`), "h-value")}
        </tbody>
      </table>
    `;
  };

  const body = pages
    .map(
      (p, i) => `
        <div class="page" style="${i < pages.length - 1 ? "page-break-after:always;" : ""}">
          ${makeTable(p)}
        </div>
      `
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>편철 표지 인쇄</title>
    <style>
      @page {
        size: 297mm 210mm landscape;
        margin: 1cm;
      }
      html, body {
        width: 297mm;
        margin: 0;
      }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        font-family: Pretendard, \"Malgun Gothic\", system-ui, sans-serif;
        padding-top: 8mm;
        box-sizing: border-box;
      }
      .page {
        width: 277mm;
        height: 190mm;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      table {
        width: auto;
        height: 190mm;
        border-collapse: collapse;
        border: none;
        table-layout: fixed;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      thead, tbody, tr, td {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      /* 각 표지(열): 좌우 3px, 행 사이 1px, 맨 위·아래 행만 상·하 3px */
      td.cell {
        border-left: 3px solid #000;
        border-right: 3px solid #000;
        border-top: 1px solid #000;
        border-bottom: 1px solid #000;
        text-align: center;
        vertical-align: middle;
        padding: 0.5mm 1mm;
        box-sizing: border-box;
      }
      tbody tr:first-child td.cell {
        border-top: 3px solid #000;
      }
      tbody tr:last-child td.cell {
        border-bottom: 3px solid #000;
      }
      td.cell-gap {
        width: 4mm;
        min-width: 4mm;
        max-width: 4mm;
        padding: 0;
        border: none !important;
        background: #fff;
        vertical-align: middle;
      }
      /* 라벨 4 + 값 5 + 제목 1 = 10행, 합계 190mm */
      tr.h-label td.cell { height: 7.68mm; }
      tr.h-value td.cell { height: 9.22mm; }
      /* 4*7.68 + 5*9.22 + 113.18 = 190mm */
      tr.h-title td.cell { height: 113.18mm; padding: 0; overflow: hidden; }
      .label { font-weight: 700; font-size: 10pt; }
      .value { font-size: 10pt; }
      .title {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        writing-mode: vertical-rl;
        text-orientation: mixed;
        text-align: center;
        letter-spacing: 0.3em;
        font-weight: 800;
        font-size: 24pt;
        line-height: 1.1;
        overflow: hidden;
      }
    </style>
  </head>
  <body>
    ${body}
    <script>
      function fitSpineTitles() {
        var tol = 2;
        document.querySelectorAll("tr.h-title td.cell .title").forEach(function (el) {
          var cell = el.closest("td");
          if (!cell) return;
          var pt = 24;
          var minPt = 7;
          el.style.fontSize = pt + "pt";
          function fits() {
            return (
              el.scrollHeight <= cell.clientHeight + tol &&
              el.scrollWidth <= cell.clientWidth + tol
            );
          }
          while (pt > minPt && !fits()) {
            pt -= 0.25;
            el.style.fontSize = pt + "pt";
          }
        });
      }
      window.onload = function () {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            fitSpineTitles();
            try { window.focus(); } catch (e) {}
            window.print();
          });
        });
      };
    </script>
  </body>
</html>`;
}

export default function Archive() {
  const [tab, setTab] = useState("expenseVoucherSpine");
  const [expenseRows, setExpenseRows] = useState(() => normalizeExpenseState(loadJson(STORAGE_EXPENSE, null)));

  useEffect(() => {
    localStorage.setItem(STORAGE_EXPENSE, JSON.stringify(expenseRows));
  }, [expenseRows]);

  const tabCls = (active) =>
    active
      ? "rounded-md bg-[#37352f] px-3 py-1.5 text-sm font-medium text-white shadow-sm"
      : "rounded-md px-3 py-1.5 text-sm font-medium text-[#787774] hover:bg-[#f7f6f3]";

  const addExpenseRow = useCallback(() => {
    setExpenseRows((prev) => [...prev, defaultExpenseRow()]);
  }, []);

  const focusSpineGridCell = useCallback((rowId, field) => {
    const el = document.getElementById(`spine-grid-${rowId}-${field}`);
    if (el && "focus" in el) {
      el.focus();
      if (typeof el.select === "function") el.select();
    }
  }, []);

  const onSpineGridKeyDown = useCallback(
    (e, row, field) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const idx = expenseRows.findIndex((r) => r.id === row.id);
      if (idx < 0) return;
      if (idx < expenseRows.length - 1) {
        const nextId = expenseRows[idx + 1].id;
        queueMicrotask(() => focusSpineGridCell(nextId, field));
      } else {
        const nr = defaultExpenseRow();
        setExpenseRows((prev) => [...prev, nr]);
        queueMicrotask(() => focusSpineGridCell(nr.id, field));
      }
    },
    [expenseRows, focusSpineGridCell]
  );

  const removeExpenseRow = useCallback((id) => {
    setExpenseRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }, []);

  const updateExpense = useCallback((id, patch) => {
    setExpenseRows((prev) => {
      if (patch.orgName !== undefined && prev[0]?.id === id) {
        const v = patch.orgName;
        return prev.map((r) => ({ ...r, orgName: v }));
      }
      return prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
    });
  }, []);

  const printExpense = useCallback(() => {
    const w = window.open("", "_blank");
    if (!w) return;
    const html = buildSpinePrintHtml(expenseRows);
    w.document.open();
    w.document.write(html);
    w.document.close();
  }, [expenseRows]);

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
          body.archive-printing-expense .archive-print-bundle.print-expense { display: block !important; }
          body.archive-printing-expense {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        @page { size: A4 landscape; margin: 12mm; }
      `}</style>
      <style>{`
        /* 편철 표지: 새 창 인쇄와 동일 행 높이(A4 가로 가용 높이 190mm) */
        @media print {
          body.archive-printing-expense table.spine-sheet-table {
            height: 190mm;
            max-height: 190mm;
            box-sizing: border-box;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          body.archive-printing-expense table.spine-sheet-table thead,
          body.archive-printing-expense table.spine-sheet-table tbody,
          body.archive-printing-expense table.spine-sheet-table tr,
          body.archive-printing-expense table.spine-sheet-table td {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          body.archive-printing-expense table.spine-sheet-table tr.spine-row-label td {
            height: 7.68mm !important;
            max-height: 7.68mm !important;
            padding: 0.5mm 1mm !important;
            vertical-align: middle !important;
          }
          body.archive-printing-expense table.spine-sheet-table tr.spine-row-value td {
            height: 9.22mm !important;
            max-height: 9.22mm !important;
            padding: 0.5mm 1mm !important;
            vertical-align: middle !important;
          }
          body.archive-printing-expense table.spine-sheet-table tr.spine-row-title td {
            height: 113.18mm !important;
            max-height: 113.18mm !important;
            padding: 0 !important;
            vertical-align: middle !important;
          }
          body.archive-printing-expense table.spine-sheet-table .spine-title-inner {
            min-height: 0 !important;
            height: 100% !important;
            max-height: 100% !important;
            font-size: 24pt !important;
            overflow: hidden !important;
          }
          body.archive-printing-expense table.spine-sheet-table .spine-label-text,
          body.archive-printing-expense table.spine-sheet-table .spine-value-text {
            font-size: 10pt !important;
          }
        }
      `}</style>

      <div className="screen-root">
        <header className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#787774]">출력</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#37352f]">편철 옆면 표지 - 지출증빙서</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#787774]">
            문서 편철 시 옆면에 붙이는 표지(10행 구조)를 브라우저에서 입력·미리보기·인쇄합니다. 데이터는 이 기기의 localStorage에만
            저장됩니다.
          </p>
        </header>

        <div className="no-print mb-6 flex flex-wrap gap-2 border-b border-[#e9e9e7] pb-4">
          <button type="button" className={tabCls(tab === "expenseVoucherSpine")} onClick={() => setTab("expenseVoucherSpine")}>
            지출증빙서 측면 표지
          </button>
        </div>

        {tab === "expenseVoucherSpine" && (
          <section className="space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#37352f]">지출증빙서 측면 표지</h2>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#787774]">
                  엑셀 기초자료처럼 한 줄에 표지 하나씩 입력합니다. 셀을 눌러 바로 수정하고, Tab으로 옆 셀, Enter로 같은 열의 다음 행으로
                  이동합니다. 인쇄는 A4 가로·여백 1cm입니다.
                </p>
              </div>
              <div className="no-print flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={printExpense}
                  className="rounded-md bg-[#2383e2] px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-[#1a6ec4]"
                >
                  인쇄
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#e9e9e7] bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#e9e9e7] bg-[#f7f6f3]">
                      <th className="w-11 whitespace-nowrap px-2 py-2.5 text-center text-[11px] font-semibold text-[#787774]">
                        번호
                      </th>
                      <th className="min-w-[140px] whitespace-nowrap px-2 py-2.5 text-[11px] font-semibold text-[#787774]">
                        제목
                      </th>
                      <th className="min-w-[88px] whitespace-nowrap px-2 py-2.5 text-[11px] font-semibold text-[#787774]">
                        회계연도
                      </th>
                      <th className="min-w-[100px] whitespace-nowrap px-2 py-2.5 text-[11px] font-semibold text-[#787774]">
                        연월
                      </th>
                      <th className="min-w-[120px] whitespace-nowrap px-2 py-2.5 text-[11px] font-semibold text-[#787774]">
                        기간
                      </th>
                      <th className="min-w-[100px] whitespace-nowrap px-2 py-2.5 text-[11px] font-semibold text-[#787774]">
                        일련번호
                      </th>
                      <th className="min-w-[100px] whitespace-nowrap px-2 py-2.5 text-[11px] font-semibold text-[#787774]">
                        기관명
                      </th>
                      <th className="w-20 whitespace-nowrap px-2 py-2.5 text-[11px] font-semibold text-[#787774]">
                        너비(cm)
                      </th>
                      <th className="w-[72px] whitespace-nowrap px-2 py-2.5 text-center text-[11px] font-semibold text-[#787774]">
                        삭제
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseRows.map((row, idx) => (
                      <tr
                        key={row.id}
                        className="border-b border-[#f0f0ef] transition-colors last:border-b-0 hover:bg-[#fbfbfa]/90"
                      >
                        <td
                          className="select-none px-2 py-0 text-center text-xs tabular-nums text-[#9b9a97]"
                          tabIndex={-1}
                          aria-label={`행 ${idx + 1}`}
                        >
                          {idx + 1}
                        </td>
                        <td className="p-0 align-middle">
                          <input
                            id={`spine-grid-${row.id}-title`}
                            className={SPINE_GRID_INPUT_CLASS}
                            value={row.title}
                            onChange={(e) => updateExpense(row.id, { title: e.target.value })}
                            onKeyDown={(e) => onSpineGridKeyDown(e, row, "title")}
                            placeholder="학교회계 지출증빙서"
                            autoComplete="off"
                          />
                        </td>
                        <td className="p-0 align-middle">
                          <input
                            id={`spine-grid-${row.id}-fiscalYear`}
                            className={SPINE_GRID_INPUT_CLASS}
                            value={row.fiscalYear}
                            onChange={(e) => updateExpense(row.id, { fiscalYear: e.target.value })}
                            onKeyDown={(e) => onSpineGridKeyDown(e, row, "fiscalYear")}
                            placeholder="예) 2026회계"
                            autoComplete="off"
                          />
                        </td>
                        <td className="p-0 align-middle">
                          <input
                            id={`spine-grid-${row.id}-yearMonth`}
                            className={SPINE_GRID_INPUT_CLASS}
                            value={row.yearMonth}
                            onChange={(e) => updateExpense(row.id, { yearMonth: e.target.value })}
                            onKeyDown={(e) => onSpineGridKeyDown(e, row, "yearMonth")}
                            placeholder="예) 2026년 4월"
                            autoComplete="off"
                          />
                        </td>
                        <td className="p-0 align-middle">
                          <input
                            id={`spine-grid-${row.id}-period`}
                            className={SPINE_GRID_INPUT_CLASS}
                            value={row.period}
                            onChange={(e) => updateExpense(row.id, { period: e.target.value })}
                            onKeyDown={(e) => onSpineGridKeyDown(e, row, "period")}
                            placeholder="예) 1일~14일"
                            autoComplete="off"
                          />
                        </td>
                        <td className="p-0 align-middle">
                          <input
                            id={`spine-grid-${row.id}-serialLabel`}
                            className={SPINE_GRID_INPUT_CLASS}
                            value={row.serialLabel}
                            onChange={(e) => updateExpense(row.id, { serialLabel: e.target.value })}
                            onKeyDown={(e) => onSpineGridKeyDown(e, row, "serialLabel")}
                            placeholder="예) 5책중1책"
                            autoComplete="off"
                          />
                        </td>
                        <td className="p-0 align-middle">
                          <input
                            id={`spine-grid-${row.id}-orgName`}
                            className={SPINE_GRID_INPUT_CLASS}
                            value={row.orgName}
                            onChange={(e) => updateExpense(row.id, { orgName: e.target.value })}
                            onKeyDown={(e) => onSpineGridKeyDown(e, row, "orgName")}
                            placeholder="예) OO학교"
                            autoComplete="off"
                          />
                        </td>
                        <td className="p-0 align-middle">
                          <input
                            id={`spine-grid-${row.id}-widthCm`}
                            type="number"
                            step="0.1"
                            min="0.1"
                            className={`${SPINE_GRID_INPUT_CLASS} tabular-nums`}
                            value={row.widthCm}
                            onChange={(e) => {
                              const n = Number.parseFloat(e.target.value);
                              updateExpense(row.id, {
                                widthCm: Number.isFinite(n) && n > 0 ? n : 3.5,
                              });
                            }}
                            onKeyDown={(e) => onSpineGridKeyDown(e, row, "widthCm")}
                            autoComplete="off"
                          />
                        </td>
                        <td className="px-1 py-1 text-center align-middle">
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => removeExpenseRow(row.id)}
                            className="rounded border border-[#e9e9e7] bg-white px-2 py-1 text-[10px] font-medium text-[#787774] transition hover:border-[#fecaca] hover:bg-[#fff5f5] hover:text-[#b91c1c]"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-[#e9e9e7] bg-[#fbfbfa] px-2 py-2">
                <button
                  type="button"
                  onClick={addExpenseRow}
                  className="rounded-md border border-dashed border-[#d3d2cd] bg-white px-3 py-2 text-xs font-medium text-[#5c5b57] transition hover:border-[#2383e2]/40 hover:bg-[#f7f6f3] hover:text-[#37352f]"
                >
                  + 행 추가
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-[#e9e9e7] bg-[#fbfbfa] p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-[#37352f]">미리보기</h3>
              <p className="mt-1 text-xs text-[#787774]">
                연월·기간이 분리된 10행 구조이며, 5개 열씩 한 페이지에 맞춰집니다. (표지가 6개 이상이면 다음 페이지로 이어집니다.)
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

      <div className="archive-print-bundle print-expense">
        <div className="spine-doc-print">
          <SpineTableDocument rows={expenseRows} forPrint />
        </div>
      </div>
    </main>
  );
}
