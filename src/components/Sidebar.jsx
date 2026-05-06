import { useState } from "react";
import { NavLink } from "react-router-dom";

const MUTED = "#9b9a97";

function navLinkClass(isActive) {
  const base =
    "flex w-full items-center gap-2 rounded-[6px] px-2 py-[6px] text-left text-[13px] text-[#37352f] no-underline transition-colors";
  if (isActive) {
    return `${base} font-medium`;
  }
  return `${base} font-normal hover:bg-black/[0.04]`;
}

function navLinkStyle(isActive) {
  return isActive
    ? { background: "var(--color-background-primary)", fontWeight: 500 }
    : { background: "transparent", fontWeight: 400 };
}

export function Sidebar() {
  const [programsOpen, setProgramsOpen] = useState(true);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  return (
    <aside
      className="print:hidden"
      style={{
        width: 248,
        height: "100vh",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--color-background-secondary)",
        borderRight: "0.5px solid var(--color-border-tertiary)",
        boxSizing: "border-box",
      }}
    >
      <NavLink
        to="/"
        end
        className={({ isActive }) => `${navLinkClass(isActive)} mb-1 block`}
        style={({ isActive }) => ({
          ...navLinkStyle(isActive),
          padding: "12px 14px 10px",
          borderRadius: 0,
          borderBottom: "1px solid var(--color-border-tertiary)",
        })}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-medium leading-snug text-[#37352f]">
            경기교행 업무도우미
          </span>
          <span className="text-[11px] leading-snug" style={{ color: MUTED }}>
            경기도 교육행정직 공무원
          </span>
        </div>
      </NavLink>

      <nav
        className="flex flex-1 flex-col gap-0.5 overflow-hidden px-2 pb-3 pt-2"
        aria-label="주요 메뉴"
      >
        <div className="flex flex-1 flex-col overflow-hidden">
          <NavLink
            to="/school-info"
            className={({ isActive }) => navLinkClass(isActive)}
            style={({ isActive }) => navLinkStyle(isActive)}
          >
            <span aria-hidden>🏫</span>
            <span>학교 정보 조회</span>
          </NavLink>
          <NavLink
            to="/guide"
            className={({ isActive }) =>
              `${navLinkClass(isActive)} flex-wrap items-center gap-x-1 gap-y-1`
            }
            style={({ isActive }) => navLinkStyle(isActive)}
            title="내용 수정 중"
          >
            <span aria-hidden>📋</span>
            <span className="min-w-0 flex-1 leading-snug">
              업무별 월간 가이드
            </span>
            <span
              className="shrink-0 rounded px-1 py-px text-[9px] font-semibold leading-tight"
              style={{
                color: "#9A3412",
                background: "#FFFBEB",
                border: "1px solid #FDE68A",
              }}
            >
              미완성 · 수정중
            </span>
          </NavLink>

          <button
            type="button"
            className="mb-0.5 mt-3 flex w-full items-center gap-1 rounded-[6px] px-2 py-[6px] text-left font-medium uppercase tracking-wide hover:bg-black/[0.04]"
            style={{ background: "transparent", fontSize: 11, color: MUTED }}
            aria-expanded={programsOpen}
            aria-controls="sidebar-folder-programs"
            onClick={() => setProgramsOpen((o) => !o)}
          >
            <span
              className="w-4 shrink-0 text-center text-[10px] text-[#787774]"
              aria-hidden
            >
              {programsOpen ? "▾" : "▸"}
            </span>
            <span>업무 도우미 프로그램</span>
          </button>
          {programsOpen ? (
            <div
              id="sidebar-folder-programs"
              className="flex flex-col gap-0.5 pb-1"
            >
              <NavLink
                to="/card-match"
                className={({ isActive }) => `${navLinkClass(isActive)} pl-5`}
                style={({ isActive }) => navLinkStyle(isActive)}
              >
                <span aria-hidden>💳</span>
                <span>카드 고지서 매칭</span>
              </NavLink>
              <NavLink
                to="/calculator"
                className={({ isActive }) => `${navLinkClass(isActive)} pl-5`}
                style={({ isActive }) => navLinkStyle(isActive)}
              >
                <span aria-hidden>🔢</span>
                <span>경제적 수리한계 계산기</span>
              </NavLink>
              <NavLink
                to="/inventory"
                className={({ isActive }) => `${navLinkClass(isActive)} pl-5`}
                style={({ isActive }) => navLinkStyle(isActive)}
              >
                <span aria-hidden>📦</span>
                <span>물품대장</span>
              </NavLink>
              <NavLink
                to="/archive"
                className={({ isActive }) => `${navLinkClass(isActive)} pl-5`}
                style={({ isActive }) => navLinkStyle(isActive)}
              >
                <span aria-hidden>🗂</span>
                <span>편철 표지</span>
              </NavLink>
            </div>
          ) : null}

          <button
            type="button"
            className="mb-0.5 mt-3 flex w-full items-center gap-1 rounded-[6px] px-2 py-[6px] text-left font-medium uppercase tracking-wide hover:bg-black/[0.04]"
            style={{ background: "transparent", fontSize: 11, color: MUTED }}
            aria-expanded={comingSoonOpen}
            aria-controls="sidebar-folder-coming"
            onClick={() => setComingSoonOpen((o) => !o)}
          >
            <span
              className="w-4 shrink-0 text-center text-[10px] text-[#787774]"
              aria-hidden
            >
              {comingSoonOpen ? "▾" : "▸"}
            </span>
            <span>준비중</span>
          </button>
          {comingSoonOpen ? (
            <div id="sidebar-folder-coming" className="flex flex-col gap-0.5">
              <NavLink
                to="/calendar"
                className={({ isActive }) => `${navLinkClass(isActive)} pl-5`}
                style={({ isActive }) => navLinkStyle(isActive)}
              >
                <span aria-hidden>🗓</span>
                <span>업무 캘린더</span>
              </NavLink>
              <NavLink
                to="/tools"
                className={({ isActive }) => `${navLinkClass(isActive)} pl-5`}
                style={({ isActive }) => navLinkStyle(isActive)}
              >
                <span aria-hidden>🛒</span>
                <span>지마켓 장바구니 선택기</span>
              </NavLink>
            </div>
          ) : null}
        </div>
      </nav>
    </aside>
  );
}
