import {
  MATCH_KIND_11,
  MATCH_KIND_NONE,
  MATCH_KIND_SPLIT,
  SHEET_RESULT_MAIN,
  SHEET_UNMATCHED_CARD,
} from "./constants.js";
import { normalizeCardApprovalDate, parseEduDate } from "./matchEngine.js";

const FONT = "맑은 고딕";

/** @param {unknown} v */
function excelDateValue(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  const d = parseEduDate(v);
  if (d) return d;
  const c = normalizeCardApprovalDate(v);
  return c ?? v;
}

/**
 * @param {{
 *   checklist: { 일자: unknown, 제목: unknown, 원인행위금액: number, 대조상태: string, 카드상세정보: string, _kind: string }[],
 *   unmatchedOut: { 승인일자: unknown, 가맹점명: string, 이용금액: number }[],
 *   metrics: { total_card: number, find_money: number },
 *   kindsOrdered: string[],
 * }} payload
 */
export async function buildCardMatchWorkbook(payload) {
  const { checklist, unmatchedOut, metrics, kindsOrdered } = payload;
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();

  const ws = wb.addWorksheet(SHEET_RESULT_MAIN, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const headers = ["일자", "제목", "원인행위금액", "대조상태", "카드상세정보"];
  ws.addRow(headers);
  const headerRow = ws.getRow(1);
  headerRow.height = 18;
  headerRow.eachCell((cell, col) => {
    cell.font = { name: FONT, size: 10, bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9D9D9" },
    };
    let h = "left";
    if (col === 1 || col === 4) h = "center";
    if (col === 3) h = "right";
    cell.alignment = { vertical: "middle", horizontal: h, wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  for (let i = 0; i < checklist.length; i++) {
    const r = checklist[i];
    const kind = kindsOrdered[i] ?? MATCH_KIND_NONE;
    const row = ws.addRow([
      excelDateValue(r.일자),
      r.제목 ?? "",
      r.원인행위금액,
      r.대조상태,
      r.카드상세정보 ?? "",
    ]);
    row.height = 18;
    row.eachCell((cell, col) => {
      cell.font = { name: FONT, size: 10 };
      if (kind === MATCH_KIND_NONE) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFCE4E4" },
        };
      }
      if (col === 4) {
        if (kind === MATCH_KIND_11) cell.font = { name: FONT, size: 10, bold: true, color: { argb: "FF0F7B0F" } };
        else if (kind === MATCH_KIND_SPLIT) cell.font = { name: FONT, size: 10, bold: true, color: { argb: "FFE97132" } };
        else cell.font = { name: FONT, size: 10, bold: true, color: { argb: "FFC00000" } };
      }
      if (col === 3) {
        cell.numFmt = "#,##0";
        cell.alignment = { vertical: "middle", horizontal: "right", wrapText: true };
      } else if (col === 1 || col === 4) {
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      } else {
        cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
      }
      if (col === 1 && cell.value instanceof Date) cell.numFmt = "yyyy-mm-dd";
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  }

  const lastDataRow = 1 + checklist.length;
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: lastDataRow, column: 5 },
  };

  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 28;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 40;
  ws.getColumn(6).width = 1.2;
  ws.getColumn(7).width = 24;
  ws.getColumn(8).width = 14;

  ws.mergeCells("G1:H1");
  const t = ws.getCell("G1");
  t.value = "카드 대금 검증";
  t.font = { name: FONT, size: 11, bold: true };
  t.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  t.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFFFE0" },
  };

  ws.getCell("G2").value = "카드사 청구 총액";
  ws.getCell("H2").value = metrics.total_card;
  ws.getCell("H2").numFmt = "#,##0";
  ws.getCell("G3").value = "찾아야 할 돈";
  ws.getCell("H3").value = metrics.find_money;
  ws.getCell("H3").numFmt = "#,##0";

  for (const addr of ["G2", "H2", "G3", "H3"]) {
    const c = ws.getCell(addr);
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFFE0" },
    };
    c.alignment = {
      vertical: "middle",
      horizontal: addr.startsWith("H") ? "right" : "left",
      wrapText: true,
    };
  }
  ws.getCell("G2").font = { name: FONT, size: 10, bold: false, color: { argb: "FF000000" } };
  ws.getCell("H2").font = { name: FONT, size: 10, bold: false, color: { argb: "FF000000" } };
  ws.getCell("G3").font = { name: FONT, size: 10, bold: false, color: { argb: "FF000000" } };
  ws.getCell("H3").font = { name: FONT, size: 10, bold: true, color: { argb: "FFFF0000" } };

  const thick = { style: "thick" };
  const thin = { style: "thin" };
  for (let r = 1; r <= lastDataRow; r++) {
    for (let c = 1; c <= 5; c++) {
      const cell = ws.getCell(r, c);
      cell.border = {
        top: thin,
        bottom: thin,
        left: thin,
        right: thin,
      };
    }
  }

  for (let r = 1; r <= 3; r++) {
    for (let c = 7; c <= 8; c++) {
      const cell = ws.getCell(r, c);
      const top = r === 1 ? thick : thin;
      const bottom = r === 3 ? thick : thin;
      const left = c === 7 ? thick : thin;
      const right = c === 8 ? thick : thin;
      cell.border = { top, bottom, left, right };
    }
  }

  const ws2 = wb.addWorksheet(SHEET_UNMATCHED_CARD, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const uHeaders = ["승인일자", "가맹점명", "이용금액"];
  ws2.addRow(uHeaders);
  const uh = ws2.getRow(1);
  uh.height = 18;
  uh.eachCell((cell) => {
    cell.font = { name: FONT, size: 10, bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9D9D9" },
    };
    cell.border = {
      top: thin,
      left: thin,
      bottom: thin,
      right: thin,
    };
  });
  uh.getCell(1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  uh.getCell(2).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  uh.getCell(3).alignment = { horizontal: "right", vertical: "middle", wrapText: true };

  const nData = Math.max(0, unmatchedOut.length - 1);
  for (let i = 0; i < nData; i++) {
    const u = unmatchedOut[i];
    const row = ws2.addRow([
      excelDateValue(u.승인일자),
      u.가맹점명 ?? "",
      u.이용금액,
    ]);
    row.height = 18;
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    row.getCell(2).alignment = { horizontal: "left", vertical: "top", wrapText: true };
    row.getCell(3).alignment = { horizontal: "right", vertical: "middle", wrapText: true };
    if (row.getCell(1).value instanceof Date) row.getCell(1).numFmt = "yyyy-mm-dd";
    row.getCell(3).numFmt = "#,##0";
    row.eachCell((cell) => {
      cell.font = { name: FONT, size: 10 };
      cell.border = { top: thin, left: thin, bottom: thin, right: thin };
    });
  }

  const sumRow = ws2.addRow([
    unmatchedOut[nData]?.승인일자 ?? "",
    unmatchedOut[nData]?.가맹점명 ?? "",
    unmatchedOut[nData]?.이용금액 ?? 0,
  ]);
  sumRow.height = 18;
  sumRow.eachCell((cell, col) => {
    cell.font = { name: FONT, size: 10, bold: true };
    cell.border = { top: thin, left: thin, bottom: thin, right: thin };
    if (col === 3) {
      cell.numFmt = "#,##0";
      cell.alignment = { horizontal: "right", vertical: "middle" };
    } else {
      cell.alignment = { horizontal: "left", vertical: "middle" };
    }
  });

  const lastU = 1 + nData;
  ws2.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: lastU, column: 3 },
  };
  ws2.getColumn(1).width = 14;
  ws2.getColumn(2).width = 36;
  ws2.getColumn(3).width = 14;

  const buf = await wb.xlsx.writeBuffer();
  return buf;
}
