/**
 * 편철 표지 — 9행×N열 큰 표 (화면 미리보기용)
 * - 열 너비: 입력한 widthCm를 물리적 cm 그대로 사용 (표 너비 = 열 너비 합)
 * - 바깥 테두리 3px, 안쪽 가로/세로 1px
 */

const COLS_PER_PAGE = 5;

function safeText(v) {
  const s = String(v ?? "").trim();
  return s || "\u00a0";
}

export function effectiveWidthCm(row) {
  const s = String(row?.widthCm ?? "").trim();
  const n = Number.parseFloat(s.replaceAll(",", ""));
  return Number.isFinite(n) && n > 0 ? n : 3;
}

/** @param {any[]} rows */
export function buildSpinePages(rows) {
  const out = [];
  for (let i = 0; i < rows.length; i += COLS_PER_PAGE) {
    out.push(rows.slice(i, i + COLS_PER_PAGE));
  }
  return out.length ? out : [[]];
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
  const colStyles = rows.map((r) => {
    const w = `${effectiveWidthCm(r)}cm`;
    return { width: w, minWidth: w, maxWidth: w };
  });

  return (
    <>
      <style>{`
        .spine-sheet-table { table-layout: fixed; width: auto; border-collapse: separate; border-spacing: 3mm 0; }
        .spine-sheet-table .spine-row-label { height: 36px; }
        .spine-sheet-table .spine-row-value { height: 40px; }
        .spine-sheet-table .spine-row-title { height: 200px; }
        .spine-sheet-table .spine-row-title td {
          display: flex;
          align-items: center;
          justify-content: center;
          vertical-align: middle;
          text-align: center;
        }
        .spine-sheet-table .spine-title-inner {
          min-height: 160px;
          font-size: 30px;
          line-height: 1.1;
          letter-spacing: 0.3em;
          text-align: center;
        }
      `}</style>
      <table
        className="spine-sheet-table border-separate bg-white"
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
                <ValueText>{safeText(r.serialLabel ?? r.serial ?? r.no)}</ValueText>
              </Cell>
            ))}
          </tr>
          <tr className="spine-row spine-row-title">
            {rows.map((r, i) => (
              <Cell key={r.id ?? i} style={colStyles[i]} className="p-0">
                <div
                  className="spine-title-inner flex max-h-full w-full items-center justify-center font-bold"
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
