import { Link } from "react-router-dom";

function ToolCard({ icon, title, description, badges, to, cta }) {
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
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-[#37352f] sm:text-3xl">
          반복 업무를 줄이는 작은 도구들
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[#787774] sm:text-[15px]">
          학사일정·행정 업무에 쓰는 캘린더와 카드 고지서 매칭 등, 현장에서 바로 쓸 수 있는 도구를 한곳에
          모았습니다.
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
            to={null}
            cta="소개·다운로드 (준비 중)"
          />
          <ToolCard
            icon="💳"
            title="카드 고지서 매칭"
            description="엑셀·CSV 업로드 후 원인행위와 자동 대조, 결과 엑셀 저장. 서버로 전송되지 않고 브라우저에서만 처리됩니다."
            badges={["엑셀/CSV", "자동 매칭", "결과 다운로드", "서버 불필요"]}
            to="/card-match"
            cta="웹에서 실행"
          />
        </div>
      </section>

      <section className="mt-10 rounded-lg border border-dashed border-[#e9e9e7] bg-[#fbfbfa] p-4 text-sm text-[#787774]">
        <p className="font-medium text-[#37352f]">최근 업데이트</p>
        <p className="mt-1">카드 고지서 매칭 도구를 웹(브라우저 전용)으로 이전했습니다.</p>
      </section>
    </main>
  );
}
