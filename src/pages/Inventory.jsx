import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function parseNonNegativeNumber(v) {
  const s = String(v ?? "").replaceAll(",", "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return n;
}

function formatWon(n) {
  if (!Number.isFinite(n)) return "-";
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const s = String(value).trim();
  if (!s) return null;

  // YYYYMMDD (예: 20150424)
  if (/^\d{8}$/.test(s)) {
    const y = Number(s.slice(0, 4));
    const mo = Number(s.slice(4, 6));
    const d = Number(s.slice(6, 8));
    const dt = new Date(y, mo - 1, d);
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  // YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD
  const m = s.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(y, mo - 1, d);
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  // Excel serial date number
  const n = Number(s);
  if (Number.isFinite(n) && n > 20000 && n < 90000) {
    const dt = XLSX.SSF.parse_date_code(n);
    if (dt) return new Date(dt.y, dt.m - 1, dt.d);
  }

  const dt2 = new Date(s);
  if (!Number.isNaN(dt2.getTime())) return dt2;
  return null;
}

function formatYmd(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "-";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function diffYearsFloor(from, to) {
  if (!(from instanceof Date) || !(to instanceof Date)) return null;
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  let years = b.getFullYear() - a.getFullYear();
  const anniv = new Date(a.getFullYear() + years, a.getMonth(), a.getDate());
  if (anniv > b) years -= 1;
  return years < 0 ? 0 : years;
}

function economicRepairLimit(price, lifeYears, usedYears) {
  if (!Number.isFinite(price) || !Number.isFinite(lifeYears) || !Number.isFinite(usedYears)) return null;
  if (lifeYears <= 0 || usedYears <= 0) return null;
  if (usedYears === 1) return { value: price * 0.7, basis: "최초연도", note: null };
  if (usedYears >= lifeYears) {
    return {
      value: price * 0.2,
      basis: "최종연도",
      note: usedYears > lifeYears ? "사용연수가 내용연수를 초과하여 최종연도 기준을 적용했습니다." : null,
    };
  }
  return {
    value: price * 0.7 - (usedYears * price) / (lifeYears * 2),
    basis: "중간연도",
    note: null,
  };
}

function normalizeKey(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, "")
    .replaceAll(/[()\-_/]/g, "")
    .replaceAll(/\./g, "");
}

function pick(row, candidates) {
  const cand = candidates.map((c) => normalizeKey(c));
  for (const key of Object.keys(row)) {
    const nk = normalizeKey(key);
    for (const c of cand) {
      if (nk === c) return row[key];
    }
  }
  return undefined;
}

function statusFrom(lifeYears, usedYears) {
  if (!Number.isFinite(lifeYears) || !Number.isFinite(usedYears) || lifeYears <= 0 || usedYears <= 0) return "미분류";
  if (usedYears >= lifeYears) return "초과";
  if (lifeYears - usedYears <= 1) return "임박";
  return "여유";
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ExportButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-[#e9e9e7] bg-white px-3 py-2 text-[12px] font-medium text-[#37352f] shadow-sm transition hover:bg-[#f7f6f3]"
    >
      {label}
    </button>
  );
}

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-label="닫기"
      />
      <div className="relative w-full max-w-2xl rounded-xl border border-[#e9e9e7] bg-white p-5 shadow-[0_8px_30px_rgba(15,15,15,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-[#787774]">상세</p>
            <h3 className="mt-1 text-[16px] font-semibold text-[#37352f]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#e9e9e7] bg-white px-2 py-1 text-[12px] text-[#37352f] hover:bg-[#f7f6f3]"
          >
            닫기
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export default function Inventory() {
  /** @type {[any[], any]} */
  const [items, setItems] = useState([]);
  const [loadErr, setLoadErr] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const fileRef = useRef(null);

  const today = useMemo(() => new Date(), []);

  const enriched = useMemo(() => {
    return items.map((it, idx) => {
      const acqPrice = parseNonNegativeNumber(it.acqPrice);
      const lifeYears = parseNonNegativeNumber(it.lifeYears);
      const usedYearsRaw = parseNonNegativeNumber(it.usedYears);
      const acqDate = parseDate(it.acqDate);
      const usedYearsComputed =
        usedYearsRaw && Number.isFinite(usedYearsRaw)
          ? usedYearsRaw
          : acqDate
            ? diffYearsFloor(acqDate, today) + 1
            : null;
      const usedYears = usedYearsComputed === null ? NaN : usedYearsComputed;
      const lifeY = lifeYears === null ? NaN : lifeYears;
      const price = acqPrice === null ? NaN : acqPrice;
      const repair = economicRepairLimit(price, lifeY, usedYears);
      const status = statusFrom(lifeY, usedYears);
      return {
        ...it,
        _id: it.id || `${it.assetNo || ""}-${idx}`,
        _row: idx + 1,
        _acqDate: acqDate,
        _price: price,
        _lifeYears: lifeY,
        _usedYears: usedYears,
        _status: status,
        _repair: repair,
      };
    });
  }, [items, today]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter((it) => {
      const hay = [
        it.name,
        it.location,
        it.dept,
        it.assetNo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [enriched, query]);

  const statusCounts = useMemo(() => {
    const out = { 초과: 0, 임박: 0, 여유: 0, 미분류: 0 };
    for (const it of filtered) {
      out[it._status] = (out[it._status] || 0) + 1;
    }
    return out;
  }, [filtered]);

  const deptSummary = useMemo(() => {
    /** @type {Map<string, { dept: string, total: number, 초과: number, 임박: number }>} */
    const map = new Map();
    for (const it of filtered) {
      const dept = (it.dept || "미지정").trim() || "미지정";
      if (!map.has(dept)) map.set(dept, { dept, total: 0, 초과: 0, 임박: 0 });
      const row = map.get(dept);
      row.total += 1;
      if (it._status === "초과") row.초과 += 1;
      if (it._status === "임박") row.임박 += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  async function handleFile(file) {
    setLoadErr("");
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      // 파일마다 "제목/단위 행"이 섞여 헤더 위치가 달라질 수 있어, 첫 20행에서 헤더를 자동 탐지합니다.
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: "", blankrows: false });

      const wanted = ["물품고유번호", "취득일자", "취득금액", "최초취득금액", "운용부서", "설치장소", "G2B목록명"].map(
        (x) => normalizeKey(x)
      );

      /** @type {number} */
      let headerIdx = -1;
      for (let i = 0; i < Math.min(20, aoa.length); i++) {
        const row = aoa[i];
        if (!Array.isArray(row)) continue;
        // 완전 빈 행(모든 셀이 null/undefined/공백)인 경우 헤더 탐지에서 제외
        if (row.every((x) => String(x ?? "").trim() === "")) continue;
        const keys = row.map((x) => normalizeKey(String(x ?? ""))).filter(Boolean);
        let hit = 0;
        for (const w of wanted) if (keys.includes(w)) hit += 1;
        if (hit >= 2) {
          headerIdx = i;
          break;
        }
      }

      if (headerIdx < 0) {
        throw new Error("엑셀 헤더 행을 찾을 수 없습니다. (예: '물품고유번호', '취득일자' 등이 있는 행)");
      }

      const headers = aoa[headerIdx].map((h) => String(h ?? "").trim());
      const dataRows = aoa.slice(headerIdx + 1);

      const rows = dataRows
        .filter((r) => Array.isArray(r) && r.some((x) => String(x ?? "").trim() !== ""))
        .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));

      const next = rows.map((r, i) => {
        const name = pick(r, [
          "물품명",
          "품명",
          "자산명",
          "물품명칭",
          "G2B목록명",
        ]);
        const assetNo = pick(r, ["물품고유번호", "고유번호", "자산번호", "관리번호", "자산고유번호"]);
        const location = pick(r, ["설치장소", "설치위치", "사용장소", "장소"]);
        const dept = pick(r, ["운용부서", "사용부서", "관리부서", "부서", "소관부서"]);
        const acqDate = pick(r, ["취득일자", "취득일", "구입일", "구매일"]);
        const acqPrice = pick(r, [
          "취득가격",
          "취득금액",
          "최초취득금액",
          "취득가액",
          "취득원가",
          "취득가",
        ]);
        const lifeYears =
          pick(r, ["내용연수(변경)", "내용연수변경"]) ??
          pick(r, ["내용연수(취득)", "내용연수취득"]) ??
          pick(r, ["내용연수", "내용연한", "내용연한수", "내용년수"]);
        const usedYears = pick(r, ["사용연수", "경과연수", "사용년수"]);

        return {
          id: String(pick(r, ["id", "ID"]) || `${i + 1}`),
          name: String(name || "").trim(),
          assetNo: String(assetNo || "").trim(),
          location: String(location || "").trim(),
          dept: String(dept || "").trim(),
          acqDate: acqDate,
          acqPrice: acqPrice,
          lifeYears: lifeYears,
          usedYears: usedYears,
          _raw: r,
        };
      });

      setItems(next);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : String(e));
      setItems([]);
    }
  }

  async function exportList(kind) {
    const base = filtered;
    const list =
      kind === "초과"
        ? base.filter((x) => x._status === "초과")
        : kind === "임박"
          ? base.filter((x) => x._status === "임박")
          : base;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("물품대장");

    ws.columns = [
      { header: "물품명", key: "name", width: 28 },
      { header: "물품고유번호", key: "assetNo", width: 18 },
      { header: "설치장소", key: "location", width: 18 },
      { header: "운용부서", key: "dept", width: 14 },
      { header: "취득일자", key: "acqDate", width: 12 },
      { header: "취득금액", key: "price", width: 14 },
      { header: "내용연수", key: "life", width: 10 },
      { header: "사용연수", key: "used", width: 10 },
      { header: "상태", key: "status", width: 10 },
      { header: "수리한계금액", key: "limit", width: 16 },
      { header: "기준", key: "basis", width: 10 },
    ];

    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    for (const it of list) {
      ws.addRow({
        name: it.name || "",
        assetNo: it.assetNo || "",
        location: it.location || "",
        dept: it.dept || "",
        acqDate: it._acqDate ? formatYmd(it._acqDate) : String(it.acqDate || "").trim(),
        price: Number.isFinite(it._price) ? Math.round(it._price) : "",
        life: Number.isFinite(it._lifeYears) ? it._lifeYears : "",
        used: Number.isFinite(it._usedYears) ? it._usedYears : "",
        status: it._status,
        limit: it._repair && Number.isFinite(it._repair.value) ? Math.round(it._repair.value) : "",
        basis: it._repair?.basis || "",
      });
    }

    ws.getColumn("price").numFmt = "#,##0";
    ws.getColumn("limit").numFmt = "#,##0";

    const data = await wb.xlsx.writeBuffer();
    const filename =
      kind === "초과"
        ? "물품대장_내용연수초과.xlsx"
        : kind === "임박"
          ? "물품대장_임박.xlsx"
          : "물품대장_전체.xlsx";
    downloadBlob(filename, new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  }

  async function exportDisposalTargets() {
    const list = filtered.filter((x) => x._status === "초과");
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("불용처분대상");
    ws.columns = [
      { header: "물품명", key: "name", width: 28 },
      { header: "물품고유번호", key: "assetNo", width: 18 },
      { header: "취득일자", key: "acqDate", width: 12 },
      { header: "취득금액", key: "price", width: 14 },
      { header: "내용연수", key: "life", width: 10 },
      { header: "사용연수", key: "used", width: 10 },
      { header: "수리한계금액", key: "limit", width: 16 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    for (const it of list) {
      ws.addRow({
        name: it.name || "",
        assetNo: it.assetNo || "",
        acqDate: it._acqDate ? formatYmd(it._acqDate) : String(it.acqDate || "").trim(),
        price: Number.isFinite(it._price) ? Math.round(it._price) : "",
        life: Number.isFinite(it._lifeYears) ? it._lifeYears : "",
        used: Number.isFinite(it._usedYears) ? it._usedYears : "",
        limit: it._repair && Number.isFinite(it._repair.value) ? Math.round(it._repair.value) : "",
      });
    }

    ws.getColumn("price").numFmt = "#,##0";
    ws.getColumn("limit").numFmt = "#,##0";

    const data = await wb.xlsx.writeBuffer();
    downloadBlob(
      "불용처분_대상목록.xlsx",
      new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    );
  }

  const pieData = useMemo(
    () => [
      { name: "초과", value: statusCounts.초과 },
      { name: "임박", value: statusCounts.임박 },
      { name: "여유", value: statusCounts.여유 },
    ],
    [statusCounts]
  );
  const pieColors = ["#ef4444", "#f59e0b", "#22c55e"];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-[#37352f]">물품대장</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#787774]">
        엑셀을 불러와 실시간 검색·요약 차트·내용연수 상태 분류·경제적 수리한계 계산·엑셀 내보내기를 제공합니다.
      </p>

      <section className="mt-8 rounded-lg border border-[#e9e9e7] bg-white p-4 shadow-[0_1px_2px_rgba(15,15,15,0.04)] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-[#37352f]">엑셀 불러오기</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="block w-full text-[12px] text-[#5c5b57] file:mr-3 file:rounded-md file:border file:border-[#e9e9e7] file:bg-white file:px-3 file:py-2 file:text-[12px] file:font-medium file:text-[#37352f] hover:file:bg-[#f7f6f3] sm:w-auto"
              />
              <button
                type="button"
                onClick={() => {
                  setItems([]);
                  setSelected(null);
                  setQuery("");
                  setLoadErr("");
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="rounded-md border border-[#e9e9e7] bg-white px-3 py-2 text-[12px] font-medium text-[#37352f] shadow-sm transition hover:bg-[#f7f6f3]"
              >
                초기화
              </button>
            </div>
            <p className="text-[11px] text-[#9b9a97]">
              권장 컬럼: 물품명, 물품고유번호, 설치장소, 운용부서, 취득일자, 취득금액, 내용연수 (선택: 사용연수)
            </p>
            {loadErr ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-900">{loadErr}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-[#37352f]">내보내기</p>
            <div className="flex flex-wrap gap-2">
              <ExportButton label="전체 내보내기" onClick={() => exportList("전체")} />
              <ExportButton label="내용연수 초과만" onClick={() => exportList("초과")} />
              <ExportButton label="임박만" onClick={() => exportList("임박")} />
              <ExportButton label="불용처분 대상 목록 다운로드" onClick={exportDisposalTargets} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-[#e9e9e7] bg-[#fbfbfa] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[13px] font-semibold text-[#37352f]">검색</p>
                <p className="mt-0.5 text-[11px] text-[#9b9a97]">
                  물품명 · 설치장소 · 운용부서 · 물품고유번호
                </p>
              </div>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색어를 입력하세요"
                className="w-full rounded-md border border-[#e9e9e7] bg-white px-3 py-2 text-[13px] text-[#37352f] placeholder:text-[#9b9a97] focus:border-[#2383e2] focus:outline-none focus:ring-2 focus:ring-[#2383e2]/20 sm:max-w-xs"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
              <span className="rounded-md border border-[#e9e9e7] bg-white px-2 py-1 text-[#5c5b57]">
                전체 <span className="font-semibold text-[#37352f]">{filtered.length}</span>
              </span>
              <span className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-2 py-1 text-[#991b1b]">
                초과 <span className="font-semibold">{statusCounts.초과}</span>
              </span>
              <span className="rounded-md border border-[#fde68a] bg-[#fffbeb] px-2 py-1 text-[#92400e]">
                임박 <span className="font-semibold">{statusCounts.임박}</span>
              </span>
              <span className="rounded-md border border-[#bbf7d0] bg-[#f0fdf4] px-2 py-1 text-[#166534]">
                여유 <span className="font-semibold">{statusCounts.여유}</span>
              </span>
              <span className="rounded-md border border-[#e9e9e7] bg-white px-2 py-1 text-[#787774]">
                미분류 <span className="font-semibold">{statusCounts.미분류}</span>
              </span>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-[#e9e9e7] bg-white">
              <table className="min-w-[860px] w-full text-left text-[12px]">
                <thead className="bg-[#f7f6f3] text-[#787774]">
                  <tr>
                    <th className="px-3 py-2 font-medium">물품명</th>
                    <th className="px-3 py-2 font-medium">고유번호</th>
                    <th className="px-3 py-2 font-medium">설치장소</th>
                    <th className="px-3 py-2 font-medium">운용부서</th>
                    <th className="px-3 py-2 font-medium">취득일자</th>
                    <th className="px-3 py-2 font-medium">취득금액</th>
                    <th className="px-3 py-2 font-medium">내용연수</th>
                    <th className="px-3 py-2 font-medium">사용연수</th>
                    <th className="px-3 py-2 font-medium">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-10 text-center text-[13px] text-[#787774]">
                        불러온 데이터가 없습니다. 엑셀을 불러오거나 검색어를 지워 보세요.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((it) => (
                      <tr
                        key={it._id}
                        className="cursor-pointer border-t border-[#f1f0ed] hover:bg-[#f7fbff]"
                        onClick={() => setSelected(it)}
                      >
                        <td className="px-3 py-2 font-medium text-[#37352f]">{it.name || "-"}</td>
                        <td className="px-3 py-2 text-[#5c5b57]">{it.assetNo || "-"}</td>
                        <td className="px-3 py-2 text-[#5c5b57]">{it.location || "-"}</td>
                        <td className="px-3 py-2 text-[#5c5b57]">{it.dept || "-"}</td>
                        <td className="px-3 py-2 text-[#5c5b57]">{it._acqDate ? formatYmd(it._acqDate) : String(it.acqDate || "-")}</td>
                        <td className="px-3 py-2 text-[#5c5b57]">{Number.isFinite(it._price) ? formatWon(it._price) : "-"}</td>
                        <td className="px-3 py-2 text-[#5c5b57]">{Number.isFinite(it._lifeYears) ? it._lifeYears : "-"}</td>
                        <td className="px-3 py-2 text-[#5c5b57]">{Number.isFinite(it._usedYears) ? it._usedYears : "-"}</td>
                        <td className="px-3 py-2">
                          <span
                            className={[
                              "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                              it._status === "초과"
                                ? "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
                                : it._status === "임박"
                                  ? "border-[#fde68a] bg-[#fffbeb] text-[#92400e]"
                                  : it._status === "여유"
                                    ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
                                    : "border-[#e9e9e7] bg-white text-[#787774]",
                            ].join(" ")}
                          >
                            {it._status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-[#e9e9e7] bg-white p-4">
              <p className="text-[13px] font-semibold text-[#37352f]">부서별 현황</p>
              <p className="mt-1 text-[11px] text-[#9b9a97]">전체/초과/임박 수</p>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptSummary} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dept" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="total" name="전체" fill="#94a3b8" />
                    <Bar dataKey="초과" name="초과" fill="#ef4444" />
                    <Bar dataKey="임박" name="임박" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border border-[#e9e9e7] bg-white p-4">
              <p className="text-[13px] font-semibold text-[#37352f]">내용연수 상태</p>
              <p className="mt-1 text-[11px] text-[#9b9a97]">초과/임박/여유</p>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={75} innerRadius={40} paddingAngle={2}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={pieColors[i]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Modal
        open={Boolean(selected)}
        title={selected?.name || "물품 상세"}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[#e9e9e7] bg-[#fbfbfa] p-4">
              <p className="text-[12px] font-semibold text-[#37352f]">기본 정보</p>
              <dl className="mt-3 space-y-2 text-[12px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#787774]">물품고유번호</dt>
                  <dd className="font-medium text-[#37352f]">{selected.assetNo || "-"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#787774]">설치장소</dt>
                  <dd className="font-medium text-[#37352f]">{selected.location || "-"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#787774]">운용부서</dt>
                  <dd className="font-medium text-[#37352f]">{selected.dept || "-"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#787774]">취득일자</dt>
                  <dd className="font-medium text-[#37352f]">
                    {selected._acqDate ? formatYmd(selected._acqDate) : String(selected.acqDate || "-")}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#787774]">취득금액</dt>
                  <dd className="font-medium text-[#37352f]">
                    {Number.isFinite(selected._price) ? formatWon(selected._price) : "-"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#787774]">내용연수</dt>
                  <dd className="font-medium text-[#37352f]">
                    {Number.isFinite(selected._lifeYears) ? `${selected._lifeYears}년` : "-"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#787774]">사용연수</dt>
                  <dd className="font-medium text-[#37352f]">
                    {Number.isFinite(selected._usedYears) ? `${selected._usedYears}년` : "-"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-[#e9e9e7] bg-white p-4">
              <p className="text-[12px] font-semibold text-[#37352f]">경제적 수리한계</p>
              {selected._repair ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[12px] text-[#787774]">수리한계 금액</p>
                    <p className="text-[18px] font-semibold tracking-tight text-[#37352f]">
                      {formatWon(selected._repair.value)}
                    </p>
                  </div>
                  <p className="text-[12px] text-[#787774]">
                    해당 기준: <span className="font-medium text-[#37352f]">{selected._repair.basis}</span>
                  </p>
                  <p className="text-[12px] leading-relaxed text-[#787774]">
                    수리비가 이 금액을 초과하면 <span className="font-medium text-[#37352f]">불용처분</span>이 가능할 수 있습니다.
                  </p>
                  {selected._repair.note ? (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                      {selected._repair.note}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-[12px] text-[#787774]">취득금액/내용연수/사용연수 값이 있어야 계산됩니다.</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </main>
  );
}

