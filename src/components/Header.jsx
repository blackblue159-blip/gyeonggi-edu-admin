import { NavLink } from "react-router-dom";

const navCls = ({ isActive }) =>
  isActive
    ? "rounded-md bg-[#f7f6f3] px-2.5 py-1 font-medium text-[#37352f]"
    : "rounded-md px-2.5 py-1 text-[#787774] hover:bg-[#f7f6f3]/80";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-[#e9e9e7] bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <NavLink to="/" className="group flex flex-col gap-0.5">
          <span className="text-lg font-semibold tracking-tight text-[#37352f] group-hover:text-[#2383e2]">
            경기교행 업무도우미
          </span>
          <span className="text-xs leading-snug text-[#787774]">
            경기도 교육행정직 공무원을 위한 실용 업무 도구 모음
          </span>
        </NavLink>
        <nav className="flex flex-wrap items-center justify-end gap-1 text-xs sm:text-sm" aria-label="주요 메뉴">
          <NavLink to="/" className={navCls} end>
            홈
          </NavLink>
          <span className="px-2.5 py-1 text-[#787774]">업무 캘린더</span>
          <NavLink to="/calculator" className={navCls}>
            계산기
          </NavLink>
          <NavLink to="/inventory" className={navCls}>
            물품대장
          </NavLink>
          <NavLink to="/school-info" className={navCls}>
            학교 정보
          </NavLink>
          <NavLink to="/card-match" className={navCls}>
            카드 고지서 매칭
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
