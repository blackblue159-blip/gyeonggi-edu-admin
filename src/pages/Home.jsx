import { Link } from "react-router-dom";

/** @param {"준비중" | "사용가능"} status */
function statusBadgeClass(status) {
  if (status === "사용가능") {
    return "border border-[#c7e3d0] bg-[#edf7f0] text-[#0f6b3a]";
  }
  return "border border-[#e9e9e7] bg-[#f7f6f3] text-[#787774]";
}

/**
 * @param {object} props
 * @param {string} props.icon
 * @param {string} props.title
 * @param {string} props.description
 * @param {string[]} props.badges
 * @param {"준비중" | "사용가능"} props.status
 * @param {string | null} props.to
 * @param {string} props.cta
 */
function ToolCard({ icon, title, description, badges, status, to, cta }) {
  const inner = (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ${statusBadgeClass(status)}`}
        >
          {status}
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

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <section className="mb-10">
        <h1 className="mb-3 text-2xl font-semibold tracking-tight text-[#37352f] sm:text-3xl">
          반복 업무를 줄여주는 도구들을 한곳에 모았습니다
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[#787774] sm:text-[15px]">
          학사일정·행정 업무에 쓸 수 있는 캘린더와 카드 고지서 대조 등, 현장에서 바로 활용할 수 있는 도구를
          차례로 연결해 갑니다.
        </p>
      </section>

      <section aria-labelledby="tools-heading">
        <h2 id="tools-heading" className="sr-only">
          도구 목록
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ToolCard
            icon="🗓"
            title="교육행정직 업무 캘린더"
            description="NEIS 학사일정 연동, 월간·주간 뷰, 칸반 스타일 업무 관리. 별도 앱 소개·다운로드 연결 예정입니다."
            badges={["NEIS Open API", "월간/주간", "칸반", "학교별 설정"]}
            status="준비중"
            to={null}
            cta="소개·다운로드 (준비 중)"
          />
          <ToolCard
            icon="🏫"
            title="학교 정보 조회"
            description="학교를 검색해 이번 달 학사일정을 달력으로 보고, 날짜를 눌러 중식 급식을 확인합니다."
            badges={["학교 검색", "학사일정", "급식", "NEIS"]}
            status="사용가능"
            to="/school-info"
            cta="바로 가기"
          />
          <ToolCard
            icon="🧮"
            title="경제적 수리한계 계산기"
            description="취득가격·내용연수·사용연수를 입력해 경제적 수리한계 금액을 계산합니다."
            badges={["경제적 수리한계", "천단위 콤마", "간편 입력"]}
            status="사용가능"
            to="/calculator"
            cta="바로 가기"
          />
          <ToolCard
            icon="📦"
            title="물품대장"
            description="엑셀을 불러와 검색·상태 분류·수리한계 계산·요약 차트·내보내기를 한 번에 처리합니다."
            badges={["검색", "차트", "엑셀 다운로드", "불용처분 대상"]}
            status="사용가능"
            to="/inventory"
            cta="바로 가기"
          />
          <ToolCard
            icon="🗂️"
            title="보존문서"
            description="보존문서관리대장 입력, 표지·보존상자 라벨(85mm) 인쇄, 지출증빙서 옆면 표지까지 한 페이지에서 처리합니다."
            badges={["대장", "표지", "라벨", "지출증빙", "localStorage"]}
            status="사용가능"
            to="/archive"
            cta="바로 가기"
          />
          <ToolCard
            icon="💳"
            title="카드 고지서 매칭"
            description="에듀파인 원인행위 목록과 카드 청구 내역을 대조합니다. 엑셀·CSV는 브라우저 안에서만 처리되며 서버로 전송되지 않습니다."
            badges={["엑셀/CSV", "자동 대조", "결과 다운로드", "서버 불필요"]}
            status="사용가능"
            to="/card-match"
            cta="웹에서 사용하기"
          />
        </div>
      </section>

      <section className="mt-10 rounded-lg border border-dashed border-[#e9e9e7] bg-[#fbfbfa] p-4 text-sm text-[#787774]">
        <p className="font-medium text-[#37352f]">최근 업데이트</p>
        <p className="mt-1">카드 고지서 매칭 웹앱 오픈</p>
      </section>
    </main>
  );
}
