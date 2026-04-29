function normalizeRowKeys(row) {
  const o = {};
  for (const [k, v] of Object.entries(row)) {
    o[String(k).trim()] = v;
  }
  return o;
}

async function readCsvText(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(buf.slice(3));
  }
  try {
    const u8 = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    if (u8.includes("\uFFFD")) throw new Error("replace");
    return u8;
  } catch {
    try {
      return new TextDecoder("euc-kr").decode(buf);
    } catch {
      return new TextDecoder("utf-8", { fatal: false }).decode(buf);
    }
  }
}

/**
 * @param {File} file
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function parseDataFileToRows(file) {
  const XLSX = await import("xlsx");
  const name = file.name.toLowerCase();
  let rows;

  if (name.endsWith(".csv")) {
    const text = await readCsvText(file);
    const wb = XLSX.read(text, { type: "string", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
  } else {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
  }

  return rows.map(normalizeRowKeys);
}
