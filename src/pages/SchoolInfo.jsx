import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getMealsByDate,
  getMonthSchedule,
  searchSchools,
} from "../lib/neis/client.js";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toYmd(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function ymFromDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function shiftYm(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  return ymFromDate(dt);
}

function formatYmLabel(ym) {
  const [y, m] = ym.split("-");
  return `${y}년 ${Number(m)}월`;
}

export default function SchoolInfo() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState("");
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState([]);
  /** @type {[{ atpt: string, sd: string, name: string, address: string }] | null} */
  const [school, setSchool] = useState(null);

  const [month, setMonth] = useState(() => ymFromDate(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toYmd(new Date()));

  const [scheduleMap, setScheduleMap] = useState(() => new Map());
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleErr, setScheduleErr] = useState("");

  const [meals, setMeals] = useState(null);
  const [mealsLoading, setMealsLoading] = useState(false);
  const [mealsErr, setMealsErr] = useState("");

  const calendar = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    const pad = first.getDay();
    const days = last.getDate();
    /** @type ({ day: number, dateStr: string } | null)[][] */
    const rows = [];
    let cells = [];
    for (let i = 0; i < pad; i++) cells.push(null);
    for (let d = 1; d <= days; d++) {
      const dateStr = `${y}-${pad2(m)}-${pad2(d)}`;
      cells.push({ day: d, dateStr });
      if (cells.length === 7) {
        rows.push(cells);
        cells = [];
      }
    }
    if (cells.length) {
      while (cells.length < 7) cells.push(null);
      rows.push(cells);
    }
    return rows;
  }, [month]);

  const onSearch = useCallback(async () => {
    setSearchErr("");
    setSearched(true);
    setSearching(true);
    setResults([]);
    try {
      const list = await searchSchools(query);
      setResults(list);
    } catch (e) {
      setSearchErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  }, [query]);

  useEffect(() => {
    if (!school) {
      setScheduleMap(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      setScheduleLoading(true);
      setScheduleErr("");
      try {
        const map = await getMonthSchedule(month, school);
        if (!cancelled) setScheduleMap(map);
      } catch (e) {
        if (!cancelled) setScheduleErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setScheduleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [school, month]);

  useEffect(() => {
    if (!school) {
      setMeals(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setMealsLoading(true);
      setMealsErr("");
      try {
        const m = await getMealsByDate(selectedDate, school);
        if (!cancelled) setMeals(m);
      } catch (e) {
        if (!cancelled) setMealsErr(e instanceof Error ? e.message : String(e));
        if (!cancelled) setMeals(null);
      } finally {
        if (!cancelled) setMealsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [school, selectedDate]);

  const changeMonth = (delta) => {
    const nm = shiftYm(month, delta);
    setMonth(nm);
    setSelectedDate((d) => (d.startsWith(nm) ? d : `${nm}-01`));
  };

  const todayStr = toYmd(new Date());

  const mealBusy = Boolean(school && !mealsErr && (mealsLoading || meals === null));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-[#37352f]">학교 정보 조회</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#787774]">
        학교를 검색한 뒤 이번 달 학사일정을 달력으로 확인하고, 날짜를 눌러{" "}
        <span className="font-medium text-[#37352f]">중식</span> 급식을 볼 수 있습니다. (중식 데이터가 없으면「급식 없음」) 데이터는{" "}
        <span className="font-medium text-[#37352f]">교육부 NEIS Open API</span>에서 가져옵니다.
      </p>

      <section className="mt-8 rounded-lg border border-[#e9e9e7] bg-white p-4 shadow-[0_1px_2px_rgba(15,15,15,0.04)] sm:p-5">
        <h2 className="text-[15px] font-semibold text-[#37352f]">1. 학교 검색</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="학교명을 입력하세요 (예: ○○초등학교)"
            className="w-full rounded-md border border-[#e9e9e7] bg-[#fbfbfa] px-3 py-2 text-[14px] text-[#37352f] placeholder:text-[#9b9a97] focus:border-[#2383e2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2383e2]/20"
          />
          <button
            type="button"
            onClick={onSearch}
            disabled={searching || !query.trim()}
            className="shrink-0 rounded-md border border-[#e9e9e7] bg-white px-4 py-2 text-[13px] font-medium text-[#37352f] shadow-sm transition hover:bg-[#f7f6f3] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {searching ? "검색 중…" : "검색"}
          </button>
        </div>

        {searchErr ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-900">
            {searchErr}
          </p>
        ) : null}

        {searched && !searching && !searchErr && results.length === 0 ? (
          <p className="mt-3 text-[13px] text-[#787774]">검색 결과가 없습니다. 학교명을 바꿔 다시 시도해 보세요.</p>
        ) : null}

        {results.length > 0 ? (
          <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto rounded-md border border-[#e9e9e7] bg-[#fbfbfa] p-2">
            {results.map((s) => (
              <li key={`${s.atpt}-${s.sd}`}>
                <button
                  type="button"
                  onClick={() => {
                    setSchool(s);
                    const t = toYmd(new Date());
                    if (t.startsWith(month)) setSelectedDate(t);
                    else setSelectedDate(`${month}-01`);
                  }}
                  className={`w-full rounded-md px-3 py-2 text-left text-[13px] transition ${
                    school?.sd === s.sd && school?.atpt === s.atpt
                      ? "bg-[#e8f2fc] font-medium text-[#2383e2]"
                      : "text-[#37352f] hover:bg-white"
                  }`}
                >
                  <span className="block font-medium">{s.name}</span>
                  {s.address ? (
                    <span className="mt-0.5 block text-[11px] text-[#787774]">{s.address}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {school ? (
          <p className="mt-3 text-[13px] text-[#5c5b57]">
            선택됨: <span className="font-semibold text-[#37352f]">{school.name}</span>
          </p>
        ) : (
          <p className="mt-3 text-[12px] text-[#9b9a97]">검색 결과에서 학교를 선택해 주세요.</p>
        )}
      </section>

      {!school ? (
        <p className="mt-8 rounded-lg border border-dashed border-[#e9e9e7] bg-[#fbfbfa] px-4 py-6 text-center text-sm text-[#787774]">
          학교를 선택하면 학사일정 달력과 급식이 표시됩니다.
        </p>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <section className="rounded-lg border border-[#e9e9e7] bg-white p-4 shadow-[0_1px_2px_rgba(15,15,15,0.04)] sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-[#37352f]">2. 학사일정 (월간)</h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  className="rounded-md border border-[#e9e9e7] bg-white px-2 py-1 text-[13px] text-[#37352f] hover:bg-[#f7f6f3]"
                  aria-label="이전 달"
                >
                  ‹
                </button>
                <span className="min-w-[7.5rem] text-center text-[14px] font-semibold text-[#37352f]">
                  {formatYmLabel(month)}
                </span>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  className="rounded-md border border-[#e9e9e7] bg-white px-2 py-1 text-[13px] text-[#37352f] hover:bg-[#f7f6f3]"
                  aria-label="다음 달"
                >
                  ›
                </button>
              </div>
            </div>
            {scheduleErr ? (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-900">
                {scheduleErr}
              </p>
            ) : null}
            {scheduleLoading ? (
              <p className="mt-4 text-[13px] text-[#787774]">학사일정 불러오는 중…</p>
            ) : null}

            <div className="mt-4 overflow-x-auto">
              <div className="grid grid-cols-7 gap-px rounded-lg border border-[#e9e9e7] bg-[#e9e9e7] text-center text-[11px] font-medium text-[#787774]">
                {WEEK.map((w) => (
                  <div key={w} className="bg-[#f7f6f3] py-2">
                    {w}
                  </div>
                ))}
                {calendar.flat().map((cell, idx) => {
                  if (!cell) {
                    return <div key={`e-${idx}`} className="min-h-[4.5rem] bg-[#fbfbfa]" />;
                  }
                  const { dateStr, day } = cell;
                  const titles = scheduleMap.get(dateStr) || [];
                  const isSel = dateStr === selectedDate;
                  const isToday = dateStr === todayStr;
                  const titleTip = titles.length > 0 ? titles.join("\n") : undefined;
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      title={titleTip}
                      onClick={() => setSelectedDate(dateStr)}
                      className={[
                        "flex min-h-[4.5rem] flex-col items-stretch border-t border-transparent bg-white p-1.5 text-left transition hover:bg-[#f7fbff]",
                        isSel ? "ring-2 ring-inset ring-[#2383e2]" : "",
                        isToday && !isSel ? "bg-[#fffbeb]" : "",
                      ].join(" ")}
                    >
                      <span
                        className={`text-[13px] font-semibold ${
                          isToday ? "text-[#b45309]" : "text-[#37352f]"
                        }`}
                      >
                        {day}
                      </span>
                      {titles.length > 0 ? (
                        <span className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-[#2383e2]">
                          {titles.join(" · ")}
                        </span>
                      ) : (
                        <span className="mt-auto text-[10px] text-transparent">.</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="mt-3 text-[11px] text-[#9b9a97]">
              파란 글씨는 해당 날짜의 학사일정 요약입니다. 칸을 누르면 오른쪽에서 중식 급식을 불러옵니다.
            </p>
          </section>

          <section className="rounded-lg border border-[#e9e9e7] bg-white p-4 shadow-[0_1px_2px_rgba(15,15,15,0.04)] sm:p-5">
            <h2 className="text-[15px] font-semibold text-[#37352f]">3. 급식 (중식)</h2>
            <p className="mt-1 text-[12px] text-[#787774]">
              선택한 날짜:{" "}
              <span className="font-medium text-[#37352f]">{selectedDate}</span>
            </p>

            {mealsErr ? (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-900">
                {mealsErr}
              </p>
            ) : null}
            {mealBusy ? (
              <p className="mt-4 text-[13px] text-[#787774]">급식 불러오는 중…</p>
            ) : meals && meals.중식?.length ? (
              <div className="mt-4 rounded-lg border border-[#e9e9e7] bg-[#fbfbfa] px-3 py-3">
                <p className="text-[12px] font-semibold text-[#37352f]">중식</p>
                <ul className="mt-2 space-y-1.5 text-[13px] leading-snug text-[#5c5b57]">
                  {meals.중식.map((line, i) => (
                    <li
                      key={i}
                      className="border-b border-[#f1f0ed] pb-1.5 last:border-0 last:pb-0"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-4 text-[13px] text-[#787774]">급식 없음</p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
