/**
 * NEIS Open API (교육부).
 * 허브: https://open.neis.go.kr/hub/{endpoint}
 * 인증키: import.meta.env.VITE_NEIS_API_KEY
 *
 * 브라우저에서 직접 호출합니다. NEIS 응답에 Access-Control-Allow-Origin: * 가 포함되어 CORS 허용됨.
 */
const NEIS_HUB_BASE = "https://open.neis.go.kr/hub";

/**
 * @param {unknown} data
 * @param {string} key
 * @returns {Record<string, string>[]}
 */
export function extractNeisRows(data, key) {
  if (!data || typeof data !== "object") return [];

  if (data.RESULT && typeof data.RESULT === "object") {
    const code = data.RESULT.CODE;
    if (code === "INFO-200") return [];
    if (typeof code === "string" && code.startsWith("ERROR")) {
      throw new Error(data.RESULT.MESSAGE || "NEIS API 오류");
    }
  }

  const block = data[key];
  if (!Array.isArray(block)) return [];

  for (const item of block) {
    if (item && typeof item === "object" && Array.isArray(item.row)) {
      return item.row.filter((r) => r && typeof r === "object");
    }
  }
  return [];
}

/**
 * @param {string} month YYYY-MM
 */
export function nextMonthFirstDay(month) {
  const year = Number(month.slice(0, 4));
  const mon = Number(month.slice(5, 7));
  if (mon === 12) return `${year + 1}-01-01`;
  return `${year}-${String(mon + 1).padStart(2, "0")}-01`;
}

/**
 * @param {string} endpoint
 * @param {Record<string, string | number>} params
 */
export async function neisFetchJson(endpoint, params) {
  const key = (import.meta.env.VITE_NEIS_API_KEY || "").trim();
  if (!key) {
    throw new Error(
      "NEIS API 키가 없습니다. 프로젝트 루트에 .env 파일을 만들고 VITE_NEIS_API_KEY=발급키 를 설정해 주세요. (.env.example 참고)"
    );
  }

  const search = new URLSearchParams({
    KEY: key,
    Type: "json",
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ),
  });

  const res = await fetch(`${NEIS_HUB_BASE}/${endpoint}?${search}`);
  if (!res.ok) {
    throw new Error(`NEIS 요청 실패 (${res.status})`);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("NEIS 응답을 JSON으로 읽을 수 없습니다.");
  }

  if (data?.RESULT && typeof data.RESULT === "object") {
    const code = data.RESULT.CODE;
    if (typeof code === "string" && code.startsWith("ERROR")) {
      throw new Error(data.RESULT.MESSAGE || "NEIS API 오류");
    }
  }

  return data;
}

/**
 * @param {string} q SCHUL_NM 검색어
 * @returns {Promise<{ atpt: string, sd: string, name: string, address: string }[]>}
 */
export async function searchSchools(q) {
  const query = (q || "").trim();
  if (!query) return [];

  const data = await neisFetchJson("schoolInfo", {
    SCHUL_NM: query,
    pIndex: 1,
    pSize: 50,
  });

  const rows = extractNeisRows(data, "schoolInfo");
  return rows
    .map((r) => ({
      atpt: r.ATPT_OFCDC_SC_CODE || "",
      sd: r.SD_SCHUL_CODE || "",
      name: r.SCHUL_NM || "",
      address: r.ORG_RDNMA || "",
    }))
    .filter((s) => s.atpt && s.sd && s.name);
}

/**
 * @param {string} month YYYY-MM
 * @param {{ atpt: string, sd: string }} school
 * @returns {Promise<Map<string, string[]>>} date -> titles
 */
export async function getMonthSchedule(month, school) {
  const start = `${month}-01`.replace(/-/g, "");
  const end = nextMonthFirstDay(month).replace(/-/g, "");

  const data = await neisFetchJson("SchoolSchedule", {
    ATPT_OFCDC_SC_CODE: school.atpt,
    SD_SCHUL_CODE: school.sd,
    AA_FROM_YMD: start,
    AA_TO_YMD: end,
    pIndex: 1,
    pSize: 200,
  });

  const rows = extractNeisRows(data, "SchoolSchedule");
  /** @type {Map<string, string[]>} */
  const map = new Map();

  for (const r of rows) {
    const ymd = r.AA_YMD || "";
    const title = (r.EVENT_NM || "").trim();
    if (ymd.length !== 8 || !title) continue;
    const date = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(title);
  }

  return map;
}

/**
 * @param {string} date YYYY-MM-DD
 * @param {{ atpt: string, sd: string }} school
 * @returns {Promise<{ 조식: string[], 중식: string[], 석식: string[], 기타: { label: string, items: string[] }[] }>}
 */
export async function getMealsByDate(date, school) {
  const ymd = date.replace(/-/g, "");
  const data = await neisFetchJson("mealServiceDietInfo", {
    ATPT_OFCDC_SC_CODE: school.atpt,
    SD_SCHUL_CODE: school.sd,
    MLSV_YMD: ymd,
    pIndex: 1,
    pSize: 10,
  });

  const rows = extractNeisRows(data, "mealServiceDietInfo");

  /** @type {{ 조식: string[], 중식: string[], 석식: string[] }} */
  const out = { 조식: [], 중식: [], 석식: [] };
  /** @type {{ label: string, items: string[] }[]} */
  const extra = [];

  function parseDishes(raw) {
    const s = (raw || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    return s;
  }

  for (const r of rows) {
    const nm = String(r.MMEAL_SC_NM || "").trim();
    const code = String(r.MMEAL_SC_CODE || "").trim();
    const items = parseDishes(r.DDISH_NM);
    let b = "";
    if (code === "1" || nm.includes("조식") || nm === "조식") b = "조식";
    else if (code === "2" || nm.includes("중식") || nm === "중식") b = "중식";
    else if (code === "3" || nm.includes("석식") || nm === "석식") b = "석식";
    if (b) out[b] = items;
    else if (items.length) extra.push({ label: nm || "급식", items });
  }

  return { 조식: out.조식, 중식: out.중식, 석식: out.석식, 기타: extra };
}
