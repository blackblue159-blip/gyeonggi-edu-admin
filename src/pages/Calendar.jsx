import { Link } from "react-router-dom";

export default function Calendar() {
  return (
    <main className="mx-auto w-full max-w-2xl">
      <h1 className="mb-3 text-2xl font-semibold tracking-tight text-[#37352f]">교육행정직 업무 캘린더</h1>
      <p className="mb-6 text-sm leading-relaxed text-[#787774]">
        NEIS 학사일정 연동, 월간·주간 뷰, 칸반 스타일 업무 관리 기능을 준비 중입니다. 곧 소개와
        다운로드(또는 웹 연동) 안내를 올릴 예정입니다.
      </p>
      <Link
        to="/"
        className="inline-flex text-sm font-medium text-[#2383e2] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2383e2]"
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}
