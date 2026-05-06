import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

function mobileNavClass(isActive) {
  const base =
    "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-[13px] no-underline transition-colors";
  if (isActive) {
    return `${base} bg-[#EFF6FF] font-medium text-[#1D4ED8]`;
  }
  return `${base} font-normal text-[#374151] hover:bg-blue-50/80`;
}

function SectionLabel({ children }) {
  return (
    <p
      className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-wide first:mt-0"
      style={{ color: "#6B7280" }}
    >
      {children}
    </p>
  );
}

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className="print:hidden md:hidden">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F3F4F1] px-4 py-3">
        <span className="text-sm font-semibold text-[#111827]">경기교행 업무도우미</span>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-[13px] font-medium text-[#1D4ED8] hover:bg-blue-50/80"
          aria-expanded={open}
          aria-controls="mobile-nav-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "닫기" : "메뉴"}
        </button>
      </div>
      {open ? (
        <nav
          id="mobile-nav-menu"
          className="max-h-[min(70vh,520px)] overflow-y-auto border-b border-[#E5E7EB] bg-[#FAFAF8] px-2 pb-3 pt-1"
          aria-label="모바일 메뉴"
        >
          <NavLink to="/" end className={({ isActive }) => mobileNavClass(isActive)}>
            <span aria-hidden>🏠</span>
            <span>홈</span>
          </NavLink>

          <SectionLabel>주요</SectionLabel>
          <NavLink
            to="/school-info"
            className={({ isActive }) => mobileNavClass(isActive)}
          >
            <span aria-hidden>🏫</span>
            <span>학교 정보 조회</span>
          </NavLink>
          <NavLink
            to="/guide"
            className={({ isActive }) =>
              `${mobileNavClass(isActive)} flex-wrap gap-x-1 gap-y-1`
            }
            title="내용 수정 중"
          >
            <span aria-hidden>📋</span>
            <span className="min-w-0 flex-1">업무별 월간 가이드</span>
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

          <SectionLabel>업무 도우미 프로그램</SectionLabel>
          <NavLink
            to="/card-match"
            className={({ isActive }) => mobileNavClass(isActive)}
          >
            <span aria-hidden>💳</span>
            <span>카드 고지서 매칭</span>
          </NavLink>
          <NavLink
            to="/calculator"
            className={({ isActive }) => mobileNavClass(isActive)}
          >
            <span aria-hidden>🔢</span>
            <span>경제적 수리한계 계산기</span>
          </NavLink>
          <NavLink
            to="/inventory"
            className={({ isActive }) => mobileNavClass(isActive)}
          >
            <span aria-hidden>📦</span>
            <span>물품대장</span>
          </NavLink>
          <NavLink
            to="/archive"
            className={({ isActive }) => mobileNavClass(isActive)}
          >
            <span aria-hidden>🗂</span>
            <span>편철 표지</span>
          </NavLink>

          <SectionLabel>준비중</SectionLabel>
          <NavLink
            to="/calendar"
            className={({ isActive }) => mobileNavClass(isActive)}
          >
            <span aria-hidden>🗓</span>
            <span>업무 캘린더</span>
          </NavLink>
          <NavLink to="/tools" className={({ isActive }) => mobileNavClass(isActive)}>
            <span aria-hidden>🛒</span>
            <span>지마켓 장바구니 선택기</span>
          </NavLink>
        </nav>
      ) : null}
    </header>
  );
}
