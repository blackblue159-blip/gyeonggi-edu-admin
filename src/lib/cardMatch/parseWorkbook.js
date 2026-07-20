const CARD_ALIASES = {
  date: [
    "승인일자",
    "승인일",
    "이용일자",
    "이용일",
    "사용일자",
    "사용일",
    "거래일자",
    "거래일",
    "매출일자",
  ],
  amount: [
    "이용금액",
    "승인금액",
    "국내이용금액",
    "거래금액",
    "매출금액",
    "사용금액",
    "원화이용금액",
    "원화승인금액",
    "원화환산금액",
    "청구금액",
    "결제금액",
  ],
  merchant: [
    "가맹점명/국가명",
    "가맹점명",
    "이용가맹점",
    "가맹점",
    "이용처",
    "사용처",
    "매출처",
    "상호",
    "상호명",
  ],
  cardNumber: ["카드번호", "이용카드번호", "카드No", "카드번호(끝4자리)"],
  approvalNumber: ["승인번호", "승인No", "거래번호", "매출전표번호"],
  transactionType: [
    "승인구분",
    "거래구분",
    "매출구분",
    "이용구분",
    "승인/취소",
    "거래유형",
    "상태",
    "취소여부",
    "구분",
  ],
  product: ["상품명", "카드명", "카드상품명"],
  member: ["회원명", "사용자명", "이용자명", "카드사용자", "성명"],
};

const EDU_ALIASES = {
  date: ["일자", "원인행위일자", "원인행위일", "결의일자"],
  title: ["제목", "건명", "원인행위명", "적요"],
  amount: ["원인행위금액", "원인행위 금액", "결의금액"],
};

const REQUIRED_FIELDS = {
  card: ["date", "amount", "merchant"],
  edu: ["date", "amount", "title"],
};

const CANCEL_KEYWORDS = ["취소", "환불", "반품", "승인취소", "매출취소"];

function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/\ufeff/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s\r\n\t._-]+/g, "");
}

function findColumnIndex(header, aliases) {
  const normalized = header.map(normalizeHeader);
  for (const alias of aliases) {
    const index = normalized.indexOf(normalizeHeader(alias));
    if (index !== -1) return index;
  }
  return -1;
}

function scoreHeader(header, kind) {
  const aliases = kind === "card" ? CARD_ALIASES : EDU_ALIASES;
  const mapping = Object.fromEntries(
    Object.entries(aliases).map(([field, names]) => [field, findColumnIndex(header, names)])
  );
  const required = REQUIRED_FIELDS[kind];
  const requiredHits = required.filter((field) => mapping[field] !== -1).length;
  const optionalHits = Object.entries(mapping).filter(
    ([field, index]) => !required.includes(field) && index !== -1
  ).length;
  return { score: requiredHits * 100 + optionalHits, mapping };
}

function findBestTable(sheets, kind) {
  let best = null;

  sheets.forEach((sheet, sheetOrder) => {
    const previewLength = Math.min(sheet.rows.length, 40);
    for (let headerIndex = 0; headerIndex < previewLength; headerIndex += 1) {
      const { score, mapping } = scoreHeader(sheet.rows[headerIndex], kind);
      const candidate = { ...sheet, sheetOrder, headerIndex, score, mapping };
      if (
        best == null ||
        score > best.score ||
        (score === best.score && sheetOrder < best.sheetOrder) ||
        (score === best.score && sheetOrder === best.sheetOrder && headerIndex < best.headerIndex)
      ) {
        best = candidate;
      }
    }
  });

  if (!best || best.score < 300) {
    const expected = kind === "card" ? "날짜·금액·가맹점" : "일자·제목·원인행위금액";
    throw new Error(`${expected} 열을 자동으로 찾지 못했습니다. 원본 열 제목을 확인해 주세요.`);
  }
  return best;
}

function text(value) {
  return value == null ? "" : String(value).trim();
}

function parseDateValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (value == null || text(value) === "") return null;

  const source = text(value);
  const ymdMatch = source.match(/^(\d{4})(\d{2})(\d{2})(?:\.0+)?$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    if (
      parsed.getFullYear() === Number(year) &&
      parsed.getMonth() === Number(month) - 1 &&
      parsed.getDate() === Number(day)
    ) {
      return parsed;
    }
    return null;
  }

  const numeric = Number(source.replace(/,/g, ""));
  if (Number.isFinite(numeric) && numeric >= 20000 && numeric <= 80000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const parsed = new Date(epoch.getTime() + numeric * 86400000);
    return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
  }

  const cleaned = source.replace(/\./g, "-").replace(/\//g, "-");
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function parseAmountValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? value : null;
  }
  if (typeof value === "boolean" || value == null) return null;

  let source = text(value);
  const negativeParentheses = source.startsWith("(") && source.endsWith(")");
  if (negativeParentheses) source = source.slice(1, -1);
  source = source.replace(/[,\s₩원]/g, "");
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(source)) return null;

  const parsed = Number(source) * (negativeParentheses ? -1 : 1);
  return Number.isFinite(parsed) && Number.isInteger(parsed) ? parsed : null;
}

function maskCardNumber(value) {
  const source = text(value);
  if (!source || source.includes("*")) return source;
  const digits = source.replace(/\D/g, "");
  if (digits.length < 8) return source;
  return `${digits.slice(0, 4)}${"*".repeat(Math.max(4, digits.length - 8))}${digits.slice(-4)}`;
}

function valueAt(row, mapping, field) {
  const index = mapping[field];
  return index === -1 ? null : row[index];
}

function isEmptyRow(row) {
  return !row.some((value) => value != null && text(value) !== "");
}

function detectCardCompany(fileName, rows, mapping) {
  const productIndex = mapping.product;
  const products = productIndex === -1 ? [] : rows.slice(0, 20).map((row) => text(row[productIndex]));
  const haystack = `${fileName} ${products.join(" ")}`.toLowerCase();
  if (haystack.includes("삼성") || haystack.includes("samsung")) return "삼성카드";
  if (haystack.includes("비씨") || haystack.includes("bc카드") || haystack.includes("bccard")) {
    return "BC카드";
  }
  if (mapping.date !== -1 && mapping.merchant !== -1) return "범용 카드명세서";
  return "카드명세서";
}

function normalizeCardRows(table, fileName) {
  const dataRows = table.rows.slice(table.headerIndex + 1).filter((row) => !isEmptyRow(row));
  const company = detectCardCompany(fileName, dataRows, table.mapping);

  return dataRows.flatMap((row) => {
    const date = parseDateValue(valueAt(row, table.mapping, "date"));
    const amount = parseAmountValue(valueAt(row, table.mapping, "amount"));
    const merchant = text(valueAt(row, table.mapping, "merchant"));
    const transactionType = text(valueAt(row, table.mapping, "transactionType"));
    const isAdjustment = CANCEL_KEYWORDS.some((keyword) => transactionType.includes(keyword));
    const normalizedAmount = isAdjustment ? -Math.abs(amount ?? 0) : amount;

    if (!date || normalizedAmount == null || normalizedAmount === 0) return [];
    return [
      {
        승인일자: date,
        "가맹점명/국가명": merchant,
        이용금액: normalizedAmount,
        카드번호: maskCardNumber(valueAt(row, table.mapping, "cardNumber")),
        승인번호: text(valueAt(row, table.mapping, "approvalNumber")),
        거래구분: transactionType,
        카드사: company,
      },
    ];
  });
}

function normalizeEduRows(table) {
  return table.rows
    .slice(table.headerIndex + 1)
    .filter((row) => !isEmptyRow(row))
    .map((row) => ({
      일자: parseDateValue(valueAt(row, table.mapping, "date")) ?? valueAt(row, table.mapping, "date"),
      제목: text(valueAt(row, table.mapping, "title")),
      원인행위금액: parseAmountValue(valueAt(row, table.mapping, "amount")),
    }));
}

/**
 * Parsed worksheet arrays are exported separately so header detection can be tested without File APIs.
 * @param {{ name: string, rows: unknown[][] }[]} sheets
 * @param {"card" | "edu"} kind
 * @param {string} [fileName]
 */
export function normalizeWorkbookSheets(sheets, kind, fileName = "") {
  if (kind !== "card" && kind !== "edu") {
    throw new Error("파일 종류를 확인할 수 없습니다.");
  }
  const table = findBestTable(sheets, kind);
  return kind === "card" ? normalizeCardRows(table, fileName) : normalizeEduRows(table);
}

async function readCsvText(file) {
  const buffer = new Uint8Array(await file.arrayBuffer());
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(buffer.slice(3));
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("euc-kr").decode(buffer);
  }
}

/**
 * @param {File} file
 * @param {"card" | "edu"} kind
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function parseDataFileToRows(file, kind) {
  const XLSX = await import("xlsx");
  const name = file.name.toLowerCase();
  let workbook;

  if (name.endsWith(".csv")) {
    const csvText = await readCsvText(file);
    workbook = XLSX.read(csvText, { type: "string", cellDates: false });
  } else {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  }

  const sheets = workbook.SheetNames.map((sheetName) => ({
    name: sheetName,
    rows: XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: null,
      raw: true,
    }),
  }));

  return normalizeWorkbookSheets(sheets, kind, file.name);
}
