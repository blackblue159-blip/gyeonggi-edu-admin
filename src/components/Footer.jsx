export function Footer() {
  return (
    <footer
      className="shrink-0 border-t border-[#e9e9e7] bg-[#fbfbfa] print:hidden"
      style={{ paddingLeft: 40, paddingRight: 40 }}
    >
      <div className="w-full max-w-[1320px] py-6">
        <p className="text-sm font-medium text-[#37352f]">
          경기도교육청 교육행정직 공무원 제작
        </p>
        <p className="mt-2 text-xs leading-relaxed text-[#9b9a97]">
          개인정보 수집 없음 · 회원가입 불필요 · 민감 파일은 브라우저 안에서만
          처리됩니다
        </p>
      </div>
    </footer>
  );
}
