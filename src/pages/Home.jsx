import { Link } from "react-router-dom";

/**
 * @param {object} props
 * @param {string} props.icon
 * @param {string} props.title
 * @param {string} props.description
 * @param {string | null} props.to
 * @param {string} props.cta
 */
function ToolCard({ icon, title, description, to, cta }) {
  const inner = (
    <>
      <div className="mb-3 flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
      </div>
      <h3 className="mb-2 text-base font-semibold text-[#37352f]">{title}</h3>
      <p className="mb-4 text-sm leading-relaxed text-[#787774]">{description}</p>
      <span className="inline-flex items-center text-sm font-medium text-[#2383e2]">
        {cta}
        {to ? (
          <span className="ml-1" aria-hidden>
            →
          </span>
        ) : null}
      </span>
    </>
  );

  if (!to) {
    return (
      <div className="rounded-xl border border-[#e9e9e7] bg-[#fbfbfa] p-5 text-[#9b9a97] shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
        {inner}
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="block rounded-xl border border-[#e9e9e7] bg-white p-5 shadow-[0_1px_2px_rgba(15,15,15,0.04)] transition hover:border-[#d3d3d0] hover:shadow-[0_2px_8px_rgba(15,15,15,0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2383e2]"
    >
      {inner}
    </Link>
  );
}

/**
 * @param {object} props
 * @param {string} [props.id]
 * @param {import("react").ReactNode} props.children
 */
function SectionTitle({ id, children }) {
  return (
    <h2 id={id} className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#9b9a97]">
      {children}
    </h2>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl">
      <section className="mb-12">
        <h1 className="mb-3 text-2xl font-semibold tracking-tight text-[#37352f] sm:text-3xl">
          반복 업무를 줄여주는 도구들을 한곳에 모았습니다
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[#787774] sm:text-[15px]">
          학사일정·행정 업무에 쓸 수 있는 캘린더와 카드 고지서 대조 등, 현장에서 바로 활용할 수 있는 도구를
          차례로 연결해 갑니다.
        </p>
      </section>

      <section className="mb-10" aria-labelledby="standalone-heading">
        <h2 id="standalone-heading" className="sr-only">
          바로 사용
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ToolCard
            icon="🏫"
            title="학교 정보 조회"
            description="학교를 검색해 이번 달 학사일정을 달력으로 보고, 날짜를 눌러 중식 급식을 확인합니다."
            to="/school-info"
            cta="바로 가기"
          />
          <ToolCard
            icon="📋"
            title="업무별 월간 가이드"
            description="급여·지출·세입 등 업무별 월간 할 일을 한눈에"
            to="/guide"
            cta="바로 가기"
          />
        </div>
      </section>

      <section className="mb-10" aria-labelledby="tools-programs-heading">
        <SectionTitle id="tools-programs-heading">업무 도우미 프로그램</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ToolCard
            icon="💳"
            title="카드 고지서 매칭"
            description="에듀파인 원인행위 목록과 카드 청구 내역을 대조합니다. 엑셀·CSV는 브라우저 안에서만 처리됩니다."
            to="/card-match"
            cta="웹에서 사용하기"
          />
          <ToolCard
            icon="🔢"
            title="경제적 수리한계 계산기"
            description="취득가격·내용연수·사용연수를 입력해 경제적 수리한계 금액을 계산합니다."
            to="/calculator"
            cta="바로 가기"
          />
          <ToolCard
            icon="📦"
            title="물품대장"
            description="엑셀을 불러와 검색·상태 분류·수리한계 계산·요약 차트·보내기를 한 번에 처리합니다."
            to="/inventory"
            cta="바로 가기"
          />
          <ToolCard
            icon="🗂"
            title="편철 표지"
            description="한 줄에 하나씩 입력하고, 10행 구조 편철 옆면 표지를 미리보기·인쇄합니다. 데이터는 이 기기의 localStorage에만 저장됩니다."
            to="/archive"
            cta="바로 가기"
          />
        </div>
      </section>

      <section className="mb-10" aria-labelledby="tools-soon-heading">
        <SectionTitle id="tools-soon-heading">준비중</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <ToolCard
            icon="🗓"
            title="교육행정직 업무 캘린더"
            description="NEIS 학사일정 연동, 월간·주간 뷰, 칸반 스타일 업무 관리. 소개·연결 페이지를 준비 중입니다."
            to="/calendar"
            cta="안내 보기"
          />
          <ToolCard
            icon="🛒"
            title="지마켓 장바구니 선택기"
            description="지마켓 장바구니에서 키워드로 원하는 품목만 자동 체크하는 북마클릿 설치 안내입니다."
            to="/tools"
            cta="설치 안내 보기"
          />
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-[#e9e9e7] bg-[#fbfbfa] p-4 text-sm text-[#787774]">
        <p className="font-medium text-[#37352f]">최근 업데이트</p>
        <p className="mt-1">카드 고지서 매칭 웹앱 오픈</p>
      </section>
    </main>
  );
}
