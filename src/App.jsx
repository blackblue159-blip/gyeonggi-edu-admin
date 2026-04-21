function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-[#e9e9e7] bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <a href="/" className="group flex flex-col gap-0.5">
          <span className="text-lg font-semibold tracking-tight text-[#37352f] group-hover:text-[#2383e2]">
            경기교행 업무도우미
          </span>
          <span className="text-xs text-[#787774]">
            경기도 교육행정직 업무 도구 모음
          </span>
        </a>
        <nav className="hidden items-center gap-1 text-sm text-[#787774] sm:flex" aria-label="주요 메뉴">
          <span className="rounded-md bg-[#f7f6f3] px-2.5 py-1 font-medium text-[#37352f]">
            홈
          </span>
          <span className="px-2.5 py-1">업무 캘린더</span>
          <span className="px-2.5 py-1">카드 고지서 매칭</span>
        </nav>
      </div>
    </header>
  );
}

function ToolCard({ icon, title, description, badges, href, cta }) {
  const inner = (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
        <span className="rounded-md bg-[#f7f6f3] px-2 py-0.5 text-xs font-medium text-[#787774]">
          MVP
        </span>
      </div>
      <h2 className="mb-2 text-base font-semibold text-[#37352f]">{title}</h2>
      <p className="mb-4 text-sm leading-relaxed text-[#787774]">{description}</p>
      <ul className="mb-4 flex flex-wrap gap-1.5">
        {badges.map((b) => (
          <li
            key={b}
            className="rounded border border-[#e9e9e7] bg-white px-2 py-0.5 text-xs text-[#5c5b57]"
          >
            {b}
          </li>
        ))}
      </ul>
      <span className="inline-flex items-center text-sm font-medium text-[#2383e2]">
        {cta}
        <span className="ml-1" aria-hidden>
          →
        </span>
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="block rounded-xl border border-[#e9e9e7] bg-white p-5 shadow-[0_1px_2px_rgba(15,15,15,0.04)] transition hover:border-[#d3d3d0] hover:shadow-[0_2px_8px_rgba(15,15,15,0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2383e2]"
      >
        {inner}
      </a>
    );
  }

  return (
    <div className="rounded-xl border border-[#e9e9e7] bg-white p-5 shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
      {inner}
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-[#e9e9e7] bg-[#fbfbfa]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-sm text-[#787774]">
          경기교행 업무도우미 — 경기도 교육행정직 공무원을 위한 실용 도구 모음 (초안)
        </p>
        <p className="mt-2 text-xs text-[#9b9a97]">
          개인정보 수집 없음 · 회원가입 불필요 · Cloudflare Pages 배포 예정
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col font-sans">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <section className="mb-10">
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-[#37352f] sm:text-3xl">
            반복 업무를 줄이는 작은 도구들
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[#787774] sm:text-[15px]">
            학사일정·행정 업무에 쓰는 캘린더와 카드 고지서 매칭 등, 현장에서 바로 쓸 수 있는
            도구를 한곳에 모았습니다. (PRD 2–3 기준 홈 초안 레이아웃)
          </p>
        </section>

        <section aria-labelledby="tools-heading">
          <h2 id="tools-heading" className="sr-only">
            도구 목록
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <ToolCard
              icon="🗓"
              title="교육행정직 업무 캘린더"
              description="NEIS 학사일정 연동, 월간·주간 뷰, 칸반 스타일 업무 관리. 별도 앱 소개·다운로드로 연결 예정입니다."
              badges={["NEIS Open API", "월간/주간", "칸반", "학교별 설정"]}
              href="#calendar"
              cta="소개·다운로드 (준비 중)"
            />
            <ToolCard
              icon="💳"
              title="카드 고지서 매칭"
              description="엑셀·CSV 업로드 후 예산 항목 자동 매칭, 불일치 하이라이트, 결과 엑셀 저장. 브라우저만으로 동작합니다."
              badges={["엑셀/CSV", "자동 매칭", "결과 다운로드", "서버 불필요"]}
              href="#card-matching"
              cta="웹에서 실행 (준비 중)"
            />
          </div>
        </section>

        <section className="mt-10 rounded-lg border border-dashed border-[#e9e9e7] bg-[#fbfbfa] p-4 text-sm text-[#787774]">
          <p className="font-medium text-[#37352f]">최근 업데이트</p>
          <p className="mt-1">사이트 골격 및 홈 레이아웃 초안 — 도구 페이지는 순차 연결 예정입니다.</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
