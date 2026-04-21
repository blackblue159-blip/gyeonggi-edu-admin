import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

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
  return `${y}.${m}.${d}`;
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

function diffYearsDecimal(from, to) {
  if (!(from instanceof Date) || !(to instanceof Date)) return null;
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const ms = b.getTime() - a.getTime();
  if (!Number.isFinite(ms)) return null;
  const days = ms / (1000 * 60 * 60 * 24);
  const years = Math.max(0, days / 365.25);
  return Math.round(years * 10) / 10;
}

function addYears(date, years) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  if (!Number.isFinite(years) || years <= 0) return null;
  const y = Math.trunc(years);
  const d = new Date(date.getTime());
  d.setFullYear(d.getFullYear() + y);
  return d;
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

function SortTh({ label, active, dir, onClick, className = "" }) {
  return (
    <th
      className={`px-4 py-3 font-medium whitespace-nowrap select-none ${className}`}
    >
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-[#787774] hover:text-[#37352f]">
        {label}
        {active ? <span className="text-[10px]">{dir === "asc" ? "▲" : "▼"}</span> : null}
      </button>
    </th>
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
  const [statusFilter, setStatusFilter] = useState(() => ({ 초과: true, 임박: true, 여유: true }));
  const [deptFilter, setDeptFilter] = useState(() => ({}));
  const [selected, setSelected] = useState(null);
  const [lastFileName, setLastFileName] = useState("");
  const [sort, setSort] = useState(() => ({ key: "expiryDate", dir: "asc" }));
  const [page, setPage] = useState(1);
  const fileRef = useRef(null);

  // 오늘 날짜 기준 자동 계산
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
            ? diffYearsDecimal(acqDate, today)
            : null;
      const usedYears = usedYearsComputed === null ? NaN : usedYearsComputed;
      const lifeY = lifeYears === null ? NaN : lifeYears;
      const price = acqPrice === null ? NaN : acqPrice;
      const repair = economicRepairLimit(price, lifeY, usedYears);
      const status = statusFrom(lifeY, usedYears);
      const expiryDate = acqDate ? addYears(acqDate, lifeY) : null;
      let expiryTone = "미분류";
      if (expiryDate && !Number.isNaN(expiryDate.getTime())) {
        const diffMs = expiryDate.getTime() - today.getTime();
        if (diffMs < 0) expiryTone = "초과";
        else if (diffMs <= 365.25 * 24 * 60 * 60 * 1000) expiryTone = "임박";
        else expiryTone = "여유";
      }
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
        _expiryDate: expiryDate,
        _expiryTone: expiryTone,
      };
    });
  }, [items, today]);

  const searchFiltered = useMemo(() => {
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
    for (const it of searchFiltered) {
      out[it._status] = (out[it._status] || 0) + 1;
    }
    return out;
  }, [searchFiltered]);

  const deptCounts = useMemo(() => {
    /** @type {Record<string, number>} */
    const out = {};
    for (const it of searchFiltered) {
      const d = (it.dept || "미지정").trim() || "미지정";
      out[d] = (out[d] || 0) + 1;
    }
    return out;
  }, [searchFiltered]);

  const deptList = useMemo(() => Object.keys(deptCounts).sort((a, b) => a.localeCompare(b, "ko")), [deptCounts]);

  const filtered = useMemo(() => {
    const allowedStatuses = new Set(
      Object.entries(statusFilter)
        .filter(([, v]) => v)
        .map(([k]) => k)
    );

    const deptKeys = Object.keys(deptFilter);
    const deptAllowed = new Set(deptKeys.filter((k) => deptFilter[k]));
    const deptAllOn = deptKeys.length === 0 || deptAllowed.size === deptKeys.length;

    return searchFiltered.filter((it) => {
      // 상태 필터(초과/임박/여유)만 대상으로 필터링 (미분류는 항상 제외)
      if (!allowedStatuses.has(it._status)) return false;

      // 부서 필터
      if (deptAllOn) return true;
      if (deptAllowed.size === 0) return false;
      const d = (it.dept || "미지정").trim() || "미지정";
      return deptAllowed.has(d);
    });
  }, [searchFiltered, statusFilter, deptFilter]);

  // reset page when filters/search/sort changes
  // (검색/필터 변경 시 항상 1페이지부터 보기)
  useMemo(() => null, []);

  const sorted = useMemo(() => {
    const dir = sort.dir === "desc" ? -1 : 1;
    const getVal = (it) => {
      switch (sort.key) {
        case "status":
          return it._status || "";
        case "name":
          return it.name || "";
        case "location":
          return it.location || "";
        case "dept":
          return it.dept || "";
        case "acqDate":
          return it._acqDate ? it._acqDate.getTime() : Infinity;
        case "price":
          return Number.isFinite(it._price) ? it._price : Infinity;
        case "lifeYears":
          return Number.isFinite(it._lifeYears) ? it._lifeYears : Infinity;
        case "usedYears":
          return Number.isFinite(it._usedYears) ? it._usedYears : Infinity;
        case "expiryDate":
        default:
          return it._expiryDate ? it._expiryDate.getTime() : Infinity;
      }
    };
    return [...filtered].sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return String(a._id).localeCompare(String(b._id));
    });
  }, [filtered, sort]);

  const pageSize = 100;
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const paged = useMemo(() => sorted.slice((pageSafe - 1) * pageSize, pageSafe * pageSize), [sorted, pageSafe]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, deptFilter, sort.key, sort.dir]);

  async function handleFile(file) {
    setLoadErr("");
    try {
      setLastFileName(file?.name || "");
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
        const lifeChanged = pick(r, ["내용연수(변경)", "내용연수변경"]);
        const lifeAcquired = pick(r, ["내용연수(취득)", "내용연수취득"]);
        const lifeYears =
          (String(lifeChanged ?? "").trim() ? lifeChanged : null) ??
          (String(lifeAcquired ?? "").trim() ? lifeAcquired : null) ??
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
      // 부서 필터 초기화: 업로드한 부서 전부 체크
      const depts = Array.from(
        new Set(next.map((x) => (x.dept || "미지정").trim() || "미지정"))
      ).sort((a, b) => a.localeCompare(b, "ko"));
      setDeptFilter(Object.fromEntries(depts.map((d) => [d, true])));
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : String(e));
      setItems([]);
    }
  }

  async function exportCurrentList() {
    const list = sorted;
    const counts = list.reduce(
      (acc, it) => {
        if (it._status === "초과") acc.초과 += 1;
        else if (it._status === "임박") acc.임박 += 1;
        else if (it._status === "여유") acc.여유 += 1;
        return acc;
      },
      { 초과: 0, 임박: 0, 여유: 0 }
    );

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("물품대장");
    ws.properties.defaultRowHeight = 18;

    // 상단 요약 정보
    const exportAt = new Date();
    ws.addRow([`물품대장 내보내기`]);
    ws.mergeCells(1, 1, 1, 11);
    ws.getRow(1).height = 26;
    ws.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF1E3A5F" } };

    ws.addRow(["파일명", lastFileName || "-", "출력일자", formatYmd(exportAt), ""]);
    ws.addRow(["전체", list.length, "초과", counts.초과, "임박", counts.임박, "여유", counts.여유]);
    ws.addRow([]);

    // 헤더/데이터 테이블
    ws.columns = [
      { header: "물품명", key: "name" },
      { header: "물품고유번호", key: "assetNo" },
      { header: "설치장소", key: "location" },
      { header: "운용부서", key: "dept" },
      { header: "취득일자", key: "acqDate" },
      { header: "취득금액", key: "price" },
      { header: "내용연수", key: "life" },
      { header: "사용연수", key: "used" },
      { header: "상태", key: "status" },
      { header: "수리한계금액", key: "limit" },
      { header: "기준", key: "basis" },
    ];

    const headerRowNumber = ws.lastRow.number;
    const headerRow = ws.getRow(headerRowNumber);
    headerRow.height = 22;
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    });
    ws.views = [{ state: "frozen", ySplit: headerRowNumber }];

    const DATA_FILL = {
      초과: "FFFFF0F0",
      임박: "FFFFF8E6",
      여유: "FFF0FFF4",
    };

    for (const it of list) {
      const row = ws.addRow({
        name: it.name || "",
        assetNo: it.assetNo || "",
        location: it.location || "",
        dept: it.dept || "",
        acqDate: it._acqDate ? formatYmd(it._acqDate) : String(it.acqDate || "").trim(),
        price: Number.isFinite(it._price) ? Math.round(it._price) : "",
        life: Number.isFinite(it._lifeYears) ? it._lifeYears : "",
        used: Number.isFinite(it._usedYears) ? `${it._usedYears.toFixed(1)}년` : "",
        status: it._status,
        limit: it._repair && Number.isFinite(it._repair.value) ? Math.round(it._repair.value) : "",
        basis: it._repair?.basis || "",
      });
      row.height = 18;

      const fill = DATA_FILL[it._status];
      if (fill) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
        });
      }
      row.alignment = { vertical: "middle" };
    }

    ws.getColumn("price").numFmt = "#,##0";
    ws.getColumn("limit").numFmt = "#,##0";

    // 테두리 + 컬럼 너비 자동 맞춤
    const tableStart = headerRowNumber;
    const tableEnd = ws.lastRow.number;
    const colCount = ws.columns.length;

    for (let r = tableStart; r <= tableEnd; r++) {
      const row = ws.getRow(r);
      for (let c = 1; c <= colCount; c++) {
        const cell = row.getCell(c);
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
      }
    }

    ws.columns.forEach((col) => {
      let max = String(col.header ?? "").length;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const v = cell.value;
        const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
        max = Math.max(max, s.length);
      });
      col.width = Math.min(42, Math.max(10, max + 2));
    });

    const data = await wb.xlsx.writeBuffer();
    downloadBlob(
      "물품대장_현재목록.xlsx",
      new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-[#37352f]">물품대장</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#787774]">
        엑셀을 불러와 실시간 검색·내용연수 상태 분류·경제적 수리한계 계산·엑셀 내보내기를 제공합니다.
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
              <ExportButton label="현재 목록 내보내기" onClick={exportCurrentList} />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-[#e9e9e7] bg-white p-4 shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
              <p className="text-[12px] font-semibold text-[#787774]">전체</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-[#37352f]">{filtered.length}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const only = statusFilter.초과 && !statusFilter.임박 && !statusFilter.여유;
                setStatusFilter(only ? { 초과: true, 임박: true, 여유: true } : { 초과: true, 임박: false, 여유: false });
              }}
              className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-4 text-left transition hover:brightness-[0.98]"
            >
              <p className="text-[12px] font-semibold text-[#991b1b]">초과</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-[#7f1d1d]">{statusCounts.초과}</p>
            </button>
            <button
              type="button"
              onClick={() => {
                const only = !statusFilter.초과 && statusFilter.임박 && !statusFilter.여유;
                setStatusFilter(only ? { 초과: true, 임박: true, 여유: true } : { 초과: false, 임박: true, 여유: false });
              }}
              className="rounded-lg border border-[#fdba74] bg-[#fff7ed] p-4 text-left transition hover:brightness-[0.98]"
            >
              <p className="text-[12px] font-semibold text-[#9a3412]">임박</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-[#7c2d12]">{statusCounts.임박}</p>
            </button>
            <button
              type="button"
              onClick={() => {
                const only = !statusFilter.초과 && !statusFilter.임박 && statusFilter.여유;
                setStatusFilter(only ? { 초과: true, 임박: true, 여유: true } : { 초과: false, 임박: false, 여유: true });
              }}
              className="rounded-lg border border-[#86efac] bg-[#f0fdf4] p-4 text-left transition hover:brightness-[0.98]"
            >
              <p className="text-[12px] font-semibold text-[#166534]">여유</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-[#14532d]">{statusCounts.여유}</p>
            </button>
          </div>

          <div className="mt-5 rounded-lg border border-[#e9e9e7] bg-[#fbfbfa] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[13px] font-semibold text-[#37352f]">검색</p>
                <p className="mt-0.5 text-[11px] text-[#9b9a97]">물품명 · 설치장소 · 운용부서 · 물품고유번호</p>
              </div>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색어를 입력하세요"
                className="w-full rounded-md border border-[#e9e9e7] bg-white px-3 py-2 text-[13px] text-[#37352f] placeholder:text-[#9b9a97] focus:border-[#2383e2] focus:outline-none focus:ring-2 focus:ring-[#2383e2]/20 sm:max-w-xs"
              />
            </div>

            <div className="mt-4 flex flex-col gap-3 text-[12px] text-[#37352f]">
              <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={statusFilter.초과}
                  onChange={(e) => setStatusFilter((s) => ({ ...s, 초과: e.target.checked }))}
                />
                <span className="font-medium">
                  초과 <span className="text-[#991b1b]">({statusCounts.초과})</span>
                </span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={statusFilter.임박}
                  onChange={(e) => setStatusFilter((s) => ({ ...s, 임박: e.target.checked }))}
                />
                <span className="font-medium">
                  임박 <span className="text-[#9a3412]">({statusCounts.임박})</span>
                </span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={statusFilter.여유}
                  onChange={(e) => setStatusFilter((s) => ({ ...s, 여유: e.target.checked }))}
                />
                <span className="font-medium">
                  여유 <span className="text-[#166534]">({statusCounts.여유})</span>
                </span>
              </label>
              {statusCounts.미분류 ? (
                <span className="text-[#9b9a97]">
                  미분류 {statusCounts.미분류}건
                </span>
              ) : null}
              </div>

              <div className="rounded-lg border border-[#e9e9e7] bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-[#37352f]">운용부서 필터</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeptFilter((m) => Object.fromEntries(Object.keys(m).map((k) => [k, true])))}
                      className="rounded-md border border-[#e9e9e7] bg-white px-2 py-1 text-[11px] font-medium text-[#37352f] hover:bg-[#f7f6f3]"
                    >
                      전체 선택
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeptFilter((m) => Object.fromEntries(Object.keys(m).map((k) => [k, false])))}
                      className="rounded-md border border-[#e9e9e7] bg-white px-2 py-1 text-[11px] font-medium text-[#37352f] hover:bg-[#f7f6f3]"
                    >
                      전체 해제
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex max-h-28 flex-wrap gap-2 overflow-auto pr-1">
                  {deptList.length === 0 ? (
                    <span className="text-[11px] text-[#9b9a97]">엑셀을 불러오면 부서 목록이 표시됩니다.</span>
                  ) : (
                    deptList.map((d) => (
                      <label key={d} className="inline-flex items-center gap-2 rounded-md border border-[#e9e9e7] bg-[#fbfbfa] px-2 py-1">
                        <input
                          type="checkbox"
                          checked={Boolean(deptFilter[d])}
                          onChange={(e) => setDeptFilter((m) => ({ ...m, [d]: e.target.checked }))}
                        />
                        <span className="text-[11px] font-medium text-[#37352f]">
                          {d} <span className="text-[#787774]">({deptCounts[d] || 0})</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-[#e9e9e7] bg-white">
              <table className="min-w-[980px] w-full text-left text-[12px]">
                <thead className="bg-[#f7f6f3] text-[#787774]">
                  <tr>
                    <SortTh label="상태" active={sort.key === "status"} dir={sort.dir} onClick={() => {
                      setSort((s) => ({ key: "status", dir: s.key === "status" ? (s.dir === "asc" ? "desc" : "asc") : "asc" }));
                    }} />
                    <SortTh label="물품명" active={sort.key === "name"} dir={sort.dir} onClick={() => {
                      setSort((s) => ({ key: "name", dir: s.key === "name" ? (s.dir === "asc" ? "desc" : "asc") : "asc" }));
                    }} />
                    <SortTh label="설치장소" active={sort.key === "location"} dir={sort.dir} onClick={() => {
                      setSort((s) => ({ key: "location", dir: s.key === "location" ? (s.dir === "asc" ? "desc" : "asc") : "asc" }));
                    }} />
                    <SortTh label="운용부서" active={sort.key === "dept"} dir={sort.dir} onClick={() => {
                      setSort((s) => ({ key: "dept", dir: s.key === "dept" ? (s.dir === "asc" ? "desc" : "asc") : "asc" }));
                    }} />
                    <SortTh label="취득일자" active={sort.key === "acqDate"} dir={sort.dir} onClick={() => {
                      setSort((s) => ({ key: "acqDate", dir: s.key === "acqDate" ? (s.dir === "asc" ? "desc" : "asc") : "asc" }));
                    }} />
                    <SortTh label="취득금액" active={sort.key === "price"} dir={sort.dir} onClick={() => {
                      setSort((s) => ({ key: "price", dir: s.key === "price" ? (s.dir === "asc" ? "desc" : "asc") : "asc" }));
                    }} />
                    <SortTh label="내용연수" active={sort.key === "lifeYears"} dir={sort.dir} onClick={() => {
                      setSort((s) => ({ key: "lifeYears", dir: s.key === "lifeYears" ? (s.dir === "asc" ? "desc" : "asc") : "asc" }));
                    }} />
                    <SortTh label="내용연수 만료일" active={sort.key === "expiryDate"} dir={sort.dir} onClick={() => {
                      setSort((s) => ({ key: "expiryDate", dir: s.key === "expiryDate" ? (s.dir === "asc" ? "desc" : "asc") : "asc" }));
                    }} />
                    <SortTh label="사용연수" active={sort.key === "usedYears"} dir={sort.dir} onClick={() => {
                      setSort((s) => ({ key: "usedYears", dir: s.key === "usedYears" ? (s.dir === "asc" ? "desc" : "asc") : "asc" }));
                    }} />
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-[13px] text-[#787774]">
                        불러온 데이터가 없습니다. 엑셀을 불러오거나 검색어를 지워 보세요.
                      </td>
                    </tr>
                  ) : (
                    paged.map((it) => (
                      <tr
                        key={it._id}
                        className="cursor-pointer border-t border-[#f1f0ed] transition hover:bg-[#f7fbff]"
                        onClick={() => setSelected(it)}
                      >
                        <td className="px-4 py-3.5">
                          <span
                            className={[
                              "inline-flex items-center rounded-lg px-3 py-1 text-[12px] font-semibold",
                              "whitespace-nowrap",
                              it._status === "초과"
                                ? "bg-red-600 text-white"
                                : it._status === "임박"
                                  ? "bg-orange-500 text-white"
                                  : it._status === "여유"
                                    ? "bg-green-600 text-white"
                                    : "bg-[#f7f6f3] text-[#787774] border border-[#e9e9e7]",
                            ].join(" ")}
                          >
                            {it._status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-[#37352f]">{it.name || "-"}</td>
                        <td className="px-4 py-3.5 text-[#5c5b57] whitespace-nowrap min-w-[9rem]">{it.location || "-"}</td>
                        <td className="px-4 py-3.5 text-[#5c5b57]">{it.dept || "-"}</td>
                        <td className="px-4 py-3.5 text-[#5c5b57]">
                          {it._acqDate ? formatYmd(it._acqDate) : String(it.acqDate || "-")}
                        </td>
                        <td className="px-4 py-3.5 text-[#5c5b57]">{Number.isFinite(it._price) ? formatWon(it._price) : "-"}</td>
                        <td className="px-4 py-3.5 text-[#5c5b57]">{Number.isFinite(it._lifeYears) ? it._lifeYears : "-"}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={[
                              "font-medium",
                              it._expiryTone === "초과"
                                ? "text-[#b91c1c]"
                                : it._expiryTone === "임박"
                                  ? "text-[#9a3412]"
                                  : it._expiryTone === "여유"
                                    ? "text-[#166534]"
                                    : "text-[#787774]",
                            ].join(" ")}
                          >
                            {it._expiryDate ? formatYmd(it._expiryDate) : "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[#5c5b57]">
                          {Number.isFinite(it._usedYears) ? `${it._usedYears.toFixed(1)}년` : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[12px] text-[#5c5b57]">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={pageSafe <= 1}
                  className="rounded-md border border-[#e9e9e7] bg-white px-2.5 py-1.5 font-medium text-[#37352f] hover:bg-[#f7f6f3] disabled:opacity-50"
                  aria-label="맨 처음"
                >
                  &lt;&lt;
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pageSafe <= 1}
                  className="rounded-md border border-[#e9e9e7] bg-white px-2.5 py-1.5 font-medium text-[#37352f] hover:bg-[#f7f6f3] disabled:opacity-50"
                  aria-label="이전"
                >
                  &lt;
                </button>

                {(() => {
                  const windowSize = 5;
                  const start = Math.max(1, pageSafe - windowSize);
                  const end = Math.min(totalPages, pageSafe + windowSize);
                  const nums = [];
                  const push = (x) => nums.push(x);
                  const pushEllipsis = (key) => nums.push(key);

                  push(1);
                  if (start > 2) pushEllipsis("ellipsis-left");
                  for (let n = Math.max(2, start); n <= Math.min(totalPages - 1, end); n++) push(n);
                  if (end < totalPages - 1) pushEllipsis("ellipsis-right");
                  if (totalPages > 1) push(totalPages);

                  return (
                    <div className="flex flex-wrap items-center gap-1">
                      {nums.map((n) => {
                        if (typeof n === "string") {
                          return (
                            <span key={n} className="px-1 text-[#9b9a97]">
                              …
                            </span>
                          );
                        }
                        const active = n === pageSafe;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setPage(n)}
                            className={[
                              "rounded-md border px-2.5 py-1.5 font-medium",
                              active
                                ? "border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]"
                                : "border-[#e9e9e7] bg-white text-[#37352f] hover:bg-[#f7f6f3]",
                            ].join(" ")}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={pageSafe >= totalPages}
                  className="rounded-md border border-[#e9e9e7] bg-white px-2.5 py-1.5 font-medium text-[#37352f] hover:bg-[#f7f6f3] disabled:opacity-50"
                  aria-label="다음"
                >
                  &gt;
                </button>
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={pageSafe >= totalPages}
                  className="rounded-md border border-[#e9e9e7] bg-white px-2.5 py-1.5 font-medium text-[#37352f] hover:bg-[#f7f6f3] disabled:opacity-50"
                  aria-label="맨 끝"
                >
                  &gt;&gt;
                </button>
              </div>

              <div>
                페이지 <span className="font-semibold text-[#37352f]">{pageSafe}</span> / {totalPages} (총 {sorted.length}건)
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

            <div className="sm:col-span-2 rounded-lg border border-[#e9e9e7] bg-white p-4">
              <p className="text-[12px] font-semibold text-[#37352f]">전체 컬럼</p>
              <div className="mt-3 max-h-56 overflow-auto rounded-md border border-[#e9e9e7]">
                <table className="w-full text-left text-[12px]">
                  <tbody>
                    {Object.entries(selected._raw || {}).map(([k, v]) => (
                      <tr key={k} className="border-t border-[#f1f0ed] first:border-0">
                        <td className="w-[35%] bg-[#fbfbfa] px-3 py-2 font-medium text-[#37352f]">{k}</td>
                        <td className="px-3 py-2 text-[#5c5b57]">{String(v ?? "")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </main>
  );
}

