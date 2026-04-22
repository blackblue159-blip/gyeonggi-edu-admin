/**
 * 편철 표지 — 9행×N열 큰 표 (화면 미리보기용)
 * - 열 너비: 입력한 widthCm를 물리적 cm 그대로 사용 (표 너비 = 열 너비 합)
 * - 바깥 테두리 3px, 안쪽 가로/세로 1px
 */

import { useLayoutEffect, useRef } from "react";

const COLS_PER_PAGE = 5;

/** 세로 제목이 셀 안에 들어가도록 글자 크기 축소 (writing-mode: vertical-rl 유지) */
function fitVerticalTitleFontSize(titleEl, cellEl) {
  if (!titleEl || !cellEl) return;
  let px = 30;
  const minPx = 8;
  const tol = 2;
  titleEl.style.fontSize = `${px}px`;
  const fits = () =>
    titleEl.scrollHeight <= cellEl.clientHeight + tol && titleEl.scrollWidth <= cellEl.clientWidth + tol;
  while (px > minPx && !fits()) {
    px -= 0.5;
    titleEl.style.fontSize = `${px}px`;
  }
}

function SpineGapCell() {
  return (
    <td
      className="spine-col-gap"
      style={{
        width: "4mm",
        minWidth: "4mm",
        maxWidth: "4mm",
        padding: 0,
        border: "none",
        backgroundColor: "#fff",
        verticalAlign: "middle",
      }}
      aria-hidden
    />
  );
}

function SpineTitleCell({ colStyle, titleText }) {
  const cellRef = useRef(null);
  const titleRef = useRef(null);
  useLayoutEffect(() => {
    fitVerticalTitleFontSize(titleRef.current, cellRef.current);
  }, [titleText]);

  return (
    <td
      ref={cellRef}
      className="border border-black p-0 text-center align-middle spine-title-cell"
      style={colStyle}
    >
      <div
        ref={titleRef}
        className="spine-title-inner flex h-full max-h-full w-full max-w-full items-center justify-center overflow-hidden font-bold"
        style={{
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          textAlign: "center",
          letterSpacing: "0.3em",
          lineHeight: 1.1,
        }}
      >
        {titleText}
      </div>
    </td>
  );
}

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

function withGaps(rows, colStyles, renderCell) {
  const n = rows.length;
  return rows.flatMap((r, i) => {
    const cells = [renderCell(r, i, colStyles[i])];
    if (i < n - 1) {
      cells.push(<SpineGapCell key={`gap-${String(r.id ?? i)}-${i}`} />);
    }
    return cells;
  });
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
        .spine-sheet-wrap { padding-top: 8mm; box-sizing: border-box; }
        .spine-sheet-table { table-layout: fixed; width: auto; border-collapse: collapse; }
        .spine-sheet-table td.spine-col-gap {
          border: none !important;
          background: #fff !important;
        }
        .spine-sheet-table .spine-row-label { height: 36px; }
        .spine-sheet-table .spine-row-value { height: 40px; }
        .spine-sheet-table .spine-row-title { height: 200px; }
        .spine-sheet-table .spine-title-cell { overflow: hidden; }
        .spine-sheet-table .spine-title-inner {
          min-height: 0;
          font-size: 30px;
          line-height: 1.1;
          text-align: center;
          letter-spacing: 0.3em;
        }
      `}</style>
      <div className="spine-sheet-wrap">
        <table
          className="spine-sheet-table border-collapse bg-white"
          style={{
            border: "3px solid black",
          }}
        >
          <tbody>
            <tr className="spine-row spine-row-label">
              {withGaps(rows, colStyles, (r, i, style) => (
                <Cell key={`${r.id ?? i}-fy`} style={style}>
                  <LabelText>회계연도</LabelText>
                </Cell>
              ))}
            </tr>
            <tr className="spine-row spine-row-value">
              {withGaps(rows, colStyles, (r, i, style) => (
                <Cell key={`${r.id ?? i}-fyv`} style={style}>
                  <ValueText>{safeText(r.fiscalYear)}</ValueText>
                </Cell>
              ))}
            </tr>
            <tr className="spine-row spine-row-label">
              {withGaps(rows, colStyles, (r, i, style) => (
                <Cell key={`${r.id ?? i}-ym`} style={style}>
                  <LabelText>연월</LabelText>
                </Cell>
              ))}
            </tr>
            <tr className="spine-row spine-row-value">
              {withGaps(rows, colStyles, (r, i, style) => (
                <Cell key={`${r.id ?? i}-ymv`} style={style}>
                  <ValueText>{safeText(`${String(r.yearMonth ?? "").trim()} ${String(r.period ?? "").trim()}`.trim())}</ValueText>
                </Cell>
              ))}
            </tr>
            <tr className="spine-row spine-row-label">
              {withGaps(rows, colStyles, (r, i, style) => (
                <Cell key={`${r.id ?? i}-sn`} style={style}>
                  <LabelText>일련번호</LabelText>
                </Cell>
              ))}
            </tr>
            <tr className="spine-row spine-row-value">
              {withGaps(rows, colStyles, (r, i, style) => (
                <Cell key={`${r.id ?? i}-snv`} style={style}>
                  <ValueText>{safeText(r.serialLabel ?? r.serial ?? r.no)}</ValueText>
                </Cell>
              ))}
            </tr>
            <tr className="spine-row spine-row-title">
              {withGaps(rows, colStyles, (r, i, style) => (
                <SpineTitleCell key={`${r.id ?? i}-title`} colStyle={style} titleText={safeText(r.title)} />
              ))}
            </tr>
            <tr className="spine-row spine-row-label">
              {withGaps(rows, colStyles, (r, i, style) => (
                <Cell key={`${r.id ?? i}-org`} style={style}>
                  <LabelText>기관명</LabelText>
                </Cell>
              ))}
            </tr>
            <tr className="spine-row spine-row-value">
              {withGaps(rows, colStyles, (r, i, style) => (
                <Cell key={`${r.id ?? i}-orgv`} style={style}>
                  <ValueText>{safeText(r.orgName)}</ValueText>
                </Cell>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
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
