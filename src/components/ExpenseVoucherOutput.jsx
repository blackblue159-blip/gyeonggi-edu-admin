/**
 * 편철 표지 — 9행×N열 큰 표
 * - 한 페이지에 5개 열이 꽉 차도록 (A4 가로, 여백 1cm 기준 가용 폭 27.7cm에 맞춰 스케일)
 * - 인쇄 시 표 전체 높이 19cm(190mm) 고정 → 한 페이지 안에 수용 (Archive print CSS)
 * - 바깥 테두리 3px, 안쪽 가로/세로 1px
 */

const INNER_PAGE_WIDTH_CM = 27.7; // 29.7cm - 1cm*2 (좌우 여백)
const COLS_PER_PAGE = 5;

function safeText(v) {
  const s = String(v ?? "").trim();
  return s || "\u00a0";
}

export function effectiveWidthCm(row) {
  const w = Number(row?.widthCm);
  if (!Number.isFinite(w) || w <= 0) return 3;
  return w;
}

/** @param {any[]} rows */
export function buildSpinePages(rows) {
  const out = [];
  for (let i = 0; i < rows.length; i += COLS_PER_PAGE) {
    out.push(rows.slice(i, i + COLS_PER_PAGE));
  }
  return out.length ? out : [[]];
}

function computeScale(pageRows) {
  const sum = pageRows.reduce((acc, r) => acc + effectiveWidthCm(r), 0);
  if (!Number.isFinite(sum) || sum <= 0) return 1;
  return INNER_PAGE_WIDTH_CM / sum;
}

function Cell({ children, className = "", style }) {
  return (
    <td
      className={`border border-black px-1 text-center align-middle ${className}`}
      style={style}
    >
      {children}
    </td>
  );
}

function LabelText({ children }) {
  return <span className="spine-label-text text-[14px] font-bold">{children}</span>;
}

function ValueText({ children }) {
  return <span className="spine-value-text text-[14px]">{children}</span>;
}

/** @param {{ rows: any[] }} props */
export function SpineTable({ rows }) {
  const scale = computeScale(rows);
  const colStyles = rows.map((r) => ({
    width: `${effectiveWidthCm(r) * scale}cm`,
    minWidth: `${effectiveWidthCm(r) * scale}cm`,
    maxWidth: `${effectiveWidthCm(r) * scale}cm`,
  }));

  return (
    <>
      <style>{`
        .spine-sheet-table { table-layout: fixed; }
        .spine-sheet-table .spine-row-label { height: 36px; }
        .spine-sheet-table .spine-row-value { height: 40px; }
        .spine-sheet-table .spine-row-title { height: 200px; }
        .spine-sheet-table .spine-title-inner {
          min-height: 160px;
          font-size: 20px;
          line-height: 1.1;
        }
      `}</style>
      <table
        className="spine-sheet-table border-collapse bg-white"
        style={{
          border: "3px solid black",
        }}
      >
        <tbody>
          <tr className="spine-row spine-row-label">
            {rows.map((r, i) => (
              <Cell key={r.id ?? i} style={colStyles[i]}>
                <LabelText>회계연도</LabelText>
              </Cell>
            ))}
          </tr>
          <tr className="spine-row spine-row-value">
            {rows.map((r, i) => (
              <Cell key={r.id ?? i} style={colStyles[i]}>
                <ValueText>{safeText(r.fiscalYear)}</ValueText>
              </Cell>
            ))}
          </tr>
          <tr className="spine-row spine-row-label">
            {rows.map((r, i) => (
              <Cell key={r.id ?? i} style={colStyles[i]}>
                <LabelText>연월</LabelText>
              </Cell>
            ))}
          </tr>
          <tr className="spine-row spine-row-value">
            {rows.map((r, i) => (
              <Cell key={r.id ?? i} style={colStyles[i]}>
                <ValueText>{safeText(`${String(r.yearMonth ?? "").trim()} ${String(r.period ?? "").trim()}`.trim())}</ValueText>
              </Cell>
            ))}
          </tr>
          <tr className="spine-row spine-row-label">
            {rows.map((r, i) => (
              <Cell key={r.id ?? i} style={colStyles[i]}>
                <LabelText>일련번호</LabelText>
              </Cell>
            ))}
          </tr>
          <tr className="spine-row spine-row-value">
            {rows.map((r, i) => (
              <Cell key={r.id ?? i} style={colStyles[i]}>
                <ValueText>{safeText(r.serialLabel)}</ValueText>
              </Cell>
            ))}
          </tr>
          <tr className="spine-row spine-row-title">
            {rows.map((r, i) => (
              <Cell key={r.id ?? i} style={colStyles[i]} className="p-0">
                <div
                  className="spine-title-inner flex h-full w-full items-center justify-center font-bold"
                  style={{
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                  }}
                >
                  {safeText(r.title)}
                </div>
              </Cell>
            ))}
          </tr>
          <tr className="spine-row spine-row-label">
            {rows.map((r, i) => (
              <Cell key={r.id ?? i} style={colStyles[i]}>
                <LabelText>기관명</LabelText>
              </Cell>
            ))}
          </tr>
          <tr className="spine-row spine-row-value">
            {rows.map((r, i) => (
              <Cell key={r.id ?? i} style={colStyles[i]}>
                <ValueText>{safeText(r.orgName)}</ValueText>
              </Cell>
            ))}
          </tr>
        </tbody>
      </table>
    </>
  );
}

/** @param {{ rows: any[], forPrint?: boolean }} props */
export function SpineTableDocument({ rows, forPrint = false }) {
  const pages = buildSpinePages(rows);
  return (
    <div className={forPrint ? "spine-doc-print" : ""}>
      {pages.map((pageRows, i) => (
        <div
          key={i}
          style={
            forPrint
              ? {
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  pageBreakAfter: i < pages.length - 1 ? "always" : "auto",
                }
              : { marginBottom: 16 }
          }
        >
          <SpineTable rows={pageRows} />
        </div>
      ))}
    </div>
  );
}
