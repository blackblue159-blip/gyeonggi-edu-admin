import { useCallback, useEffect, useMemo, useState } from "react";
import { ALL_TASKS } from "../data/tasks/index.js";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function currentMonthNumber() {
  return new Date().getMonth() + 1;
}

/** @param {Set<number>} set @param {number} m */
function toggleMonth(set, m) {
  const next = new Set(set);
  if (next.has(m)) next.delete(m);
  else next.add(m);
  return next;
}

export default function TaskGuide() {
  const [selectedId, setSelectedId] = useState(() => ALL_TASKS[0]?.id ?? "");
  const [openMonths, setOpenMonths] = useState(() => new Set([currentMonthNumber()]));

  const selectedTask = useMemo(
    () => ALL_TASKS.find((t) => t.id === selectedId) ?? ALL_TASKS[0],
    [selectedId],
  );

  useEffect(() => {
    setOpenMonths(new Set([currentMonthNumber()]));
  }, [selectedId]);

  const onToggleMonth = useCallback((month) => {
    setOpenMonths((prev) => toggleMonth(prev, month));
  }, []);

  if (!selectedTask) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-sm text-[#787774]">등록된 업무 데이터가 없습니다.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#37352f] sm:text-3xl">
          업무별 월간 가이드
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#787774] sm:text-[15px]">
          급여·지출·세입 등 업무별로 월마다 챙길 일을 정리해 두었습니다. JSON 파일을 편집해 내용을
          채워 넣을 수 있습니다.
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <nav
          className="shrink-0 lg:w-52"
          aria-label="업무 유형 선택"
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#9b9a97]">
            업무
          </p>
          <ul className="flex flex-row flex-wrap gap-2 lg:flex-col lg:flex-nowrap">
            {ALL_TASKS.map((task) => {
              const active = task.id === selectedTask.id;
              return (
                <li key={task.id} className="lg:w-full">
                  <button
                    type="button"
                    onClick={() => setSelectedId(task.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition sm:py-2 ${
                      active
                        ? "border-[#2383e2] bg-[#f0f7ff] font-medium text-[#37352f] shadow-[0_1px_2px_rgba(15,15,15,0.04)]"
                        : "border-[#e9e9e7] bg-white text-[#5c5b57] hover:border-[#d3d3d0] hover:bg-[#fbfbfa]"
                    }`}
                    aria-current={active ? "true" : undefined}
                  >
                    <span className="text-lg leading-none" aria-hidden>
                      {task.icon}
                    </span>
                    <span>{task.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="min-w-0 flex-1" aria-labelledby="months-heading">
          <h2 id="months-heading" className="sr-only">
            {selectedTask.label} 월별 할 일
          </h2>
          <div className="space-y-2">
            {MONTHS.map((month) => {
              const items = selectedTask.months[String(month)] ?? [];
              const expanded = openMonths.has(month);
              return (
                <div
                  key={month}
                  className="overflow-hidden rounded-lg border border-[#e9e9e7] bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04)]"
                >
                  <button
                    type="button"
                    id={`month-${month}-header`}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-[#37352f] transition hover:bg-[#fbfbfa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#2383e2] sm:px-4 sm:py-3.5"
                    aria-expanded={expanded}
                    aria-controls={`month-${month}-panel`}
                    onClick={() => onToggleMonth(month)}
                  >
                    <span>{month}월</span>
                    <span className="text-[#787774]" aria-hidden>
                      {expanded ? "▼" : "▶"}
                    </span>
                  </button>
                  {expanded ? (
                    <div
                      id={`month-${month}-panel`}
                      role="region"
                      aria-labelledby={`month-${month}-header`}
                      className="border-t border-[#e9e9e7] bg-[#fbfbfa] px-4 py-3 sm:px-4 sm:py-4"
                    >
                      {items.length === 0 ? (
                        <p className="text-sm text-[#787774]">해당 월에 등록된 업무가 없습니다.</p>
                      ) : (
                        <ul className="space-y-4">
                          {items.map((block, idx) => (
                            <li key={`${month}-${idx}`}>
                              <p className="font-semibold text-[#37352f]">{block.title}</p>
                              {Array.isArray(block.children) && block.children.length > 0 ? (
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[#5c5b57] marker:text-[#c7c7c5]">
                                  {block.children.map((child, cIdx) => (
                                    <li key={cIdx}>{child}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
