/**
 * 엑셀 `지출증빙서 옆면 표지.xlsm` — Module1.bas `지출증빙서옆면인쇄` VBA 재현
 * - 가로 인쇄, 여백 1cm, 가용 폭 27.7cm
 * - 열 너비: 기초자료 J열(cm), 0이면 3
 * - 행 높이: 1~3,6~7,9 = 30pt / 4~5 = 20pt / 8 = 300pt
 * - 글꼴 함초롬바탕, 본문 14pt / 8행 제목 세로 23pt Bold
 * - 바깥 테두리 굵게, 내부 가로선 실선, 4행 아래쪽 테두리 제거
 */

/** A4 가로 시 인쇄 가능 폭 (VBA: CentimetersToPoints(27.7)) */
export const A4_LANDSCAPE_INNER_WIDTH_CM = 27.7;

/** VBA PageSetup 네 여백 1cm */
export const PAGE_MARGIN_CM = 1;

/** 페이지 나눔 시 VBA가 더하는 37.5pt ≈ 여백·공란열 예약 */
const PAGE_BREAK_EXTRA_CM = (37.5 / 72) * 2.54;

/** 데이터 열 사이 공란 열에 해당하는 시각적 간격(cm) */
const COLUMN_SPACER_CM = 0.12;

const EV_FONT =
  '"HCR Batang", "함초롬바탕", "HC Batang", "Batang", "Malgun Gothic", "Apple SD Gothic Neo", serif';

export function effectiveWidthCm(row) {
  const w = Number(row.widthCm);
  if (!Number.isFinite(w) || w <= 0) return 3;
  return w;
}

/**
 * @param {Array<{ id: string, widthCm?: number }>} rows
 * @returns {Array<Array<typeof rows[0]>>}
 */
export function buildExpensePages(rows) {
  if (!rows.length) return [[]];
  const pages = [];
  let current = [];
  let cumulativeCm = 0;

  for (const row of rows) {
    const w = effectiveWidthCm(row);
    if (current.length > 0 && cumulativeCm + w + PAGE_BREAK_EXTRA_CM > A4_LANDSCAPE_INNER_WIDTH_CM) {
      pages.push(current);
      current = [];
      cumulativeCm = 0;
    }
    current.push(row);
    cumulativeCm += w + COLUMN_SPACER_CM;
  }
  if (current.length) pages.push(current);
  return pages;
}

const ROW_H = {
  /** 기본 30pt */
  std: "30pt",
  /** 4·5행 20pt */
  sm: "20pt",
  /** 8행 제목 300pt */
  title: "300pt",
};

const cellBase =
  "flex items-center justify-center box-border px-0.5 text-center leading-tight border-b border-black overflow-hidden";

/** @param {{ row: object }} props */
export function ExpenseDataColumn({ row }) {
  const w = effectiveWidthCm(row);
  const ym = [row.yearLabel, row.monthLabel].filter((s) => String(s || "").trim()).join(" ");
  const period = `${row.startDate ?? ""} ~ ${row.endDate ?? ""}`;
  const fiscal = String(row.fiscalYear ?? "").trim();
  const serial = String(row.serialLabel ?? "").trim();
  const title = String(row.title ?? "").trim();
  const org = String(row.orgName ?? "").trim();

  return (
    <div
      className="flex flex-col bg-white box-border shrink-0"
      style={{
        width: `${w}cm`,
        minWidth: `${w}cm`,
        fontFamily: EV_FONT,
        border: "3px solid #000",
      }}
    >
      <div className={`${cellBase} font-bold text-[14pt]`} style={{ height: ROW_H.std, minHeight: ROW_H.std }}>
        회계연도
      </div>
      <div className={`${cellBase} text-[14pt]`} style={{ height: ROW_H.std, minHeight: ROW_H.std }}>
        {fiscal || "\u00a0"}
      </div>
      <div className={`${cellBase} font-bold text-[14pt]`} style={{ height: ROW_H.std, minHeight: ROW_H.std }}>
        연월
      </div>
      <div
        className={`${cellBase} text-[14pt] border-b-0`}
        style={{ height: ROW_H.sm, minHeight: ROW_H.sm }}
      >
        {ym || "\u00a0"}
      </div>
      <div className={`${cellBase} text-[14pt]`} style={{ height: ROW_H.sm, minHeight: ROW_H.sm }}>
        {period || "\u00a0"}
      </div>
      <div className={`${cellBase} font-bold text-[14pt]`} style={{ height: ROW_H.std, minHeight: ROW_H.std }}>
        일련번호
      </div>
      <div className={`${cellBase} text-[14pt]`} style={{ height: ROW_H.std, minHeight: ROW_H.std }}>
        {serial || "\u00a0"}
      </div>
      <div
        className={`${cellBase} font-bold border-b border-black`}
        style={{
          height: ROW_H.title,
          minHeight: ROW_H.title,
          fontSize: "23pt",
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          letterSpacing: "0.05em",
        }}
      >
        {title || "\u00a0"}
      </div>
      <div
        className="flex items-center justify-center box-border px-0.5 text-center text-[14pt] leading-tight overflow-hidden border-b-0"
        style={{ height: ROW_H.std, minHeight: ROW_H.std }}
      >
        {org || "\u00a0"}
      </div>
    </div>
  );
}

/**
 * 한 페이지(가로 한 장)에 들어가는 열들
 * @param {{ rows: object[], className?: string }} props
 */
export function ExpenseVoucherPage({ rows, className = "" }) {
  if (!rows.length) {
    return (
      <div className={`text-sm text-[#787774] ${className}`}>기초자료 행이 없습니다.</div>
    );
  }
  return (
    <div
      className={`flex flex-row items-stretch justify-center ${className}`}
      style={{ gap: `${COLUMN_SPACER_CM}cm` }}
    >
      {rows.map((row) => (
        <ExpenseDataColumn key={row.id} row={row} />
      ))}
    </div>
  );
}

/**
 * @param {{ pages: object[][], printMode?: boolean }} props
 */
export function ExpenseVoucherDocument({ pages, printMode = false }) {
  return (
    <div className={printMode ? "expense-voucher-doc-print" : ""}>
      {pages.map((pageRows, i) => (
        <div
          key={i}
          className={printMode ? "expense-print-page" : "mb-8"}
          style={
            printMode
              ? {
                  minHeight: "190mm",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pageBreakAfter: i < pages.length - 1 ? "always" : "auto",
                }
              : undefined
          }
        >
          <ExpenseVoucherPage rows={pageRows} />
        </div>
      ))}
    </div>
  );
}
