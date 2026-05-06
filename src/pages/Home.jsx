import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const PORTAL_LINKS = [
  { href: "https://klef.goe.go.kr/keris_ui/main.do", label: "🏛 에듀파인" },
  { href: "https://goe.neis.go.kr/", label: "👤 나이스" },
  {
    href: "https://goe.eduptl.kr/bpm_lgn_lg00_001.do?noEpSession",
    label: "📋 업무포털",
  },
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatClock(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

function HomeDateTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-start md:items-end">
      <time
        dateTime={now.toISOString()}
        aria-live="polite"
        className="tabular-nums"
        style={{
          fontSize: 21,
          fontWeight: 600,
          color: "#111827",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          lineHeight: 1.2,
        }}
      >
        {formatClock(now)}
      </time>
      <p
        className="mt-1 text-left md:text-right"
        style={{
          fontSize: 11,
          color: "#6B7280",
          lineHeight: 1.35,
        }}
      >
        {dateFormatter.format(now)}
      </p>
    </div>
  );
}

function PortalBadge({ href, children }) {
  const [hover, setHover] = useState(false);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 11,
        padding: "4px 10px",
        borderRadius: 20,
        border: hover ? "1px solid #BFDBFE" : "1px solid #E5E7EB",
        background: hover ? "#F8FAFC" : "#FFFFFF",
        color: "#6B7280",
        cursor: "pointer",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </a>
  );
}

function PortalBadges() {
  return (
    <div className="mt-1.5 flex flex-wrap justify-start gap-1.5 md:justify-end">
      {PORTAL_LINKS.map((item) => (
        <PortalBadge key={item.href} href={item.href}>
          {item.label}
        </PortalBadge>
      ))}
    </div>
  );
}

/**
 * @param {object} props
 * @param {string} props.icon
 * @param {string} props.title
 * @param {string} props.description
 * @param {string | null} props.to
 * @param {string} props.cta
 * @param {boolean} [props.showDraftBadge]
 * @param {boolean} [props.featured]
 * @param {"blue"|"indigo"|"teal"|"amber"|"slate"} [props.accent]
 */
const ACCENT_BAR = {
  blue: "#2563EB",
  indigo: "#4F46E5",
  teal: "#0D9488",
  amber: "#D97706",
  slate: "#94A3B8",
};

function toolCardTopColor(featured, accent) {
  if (featured) return ACCENT_BAR.blue;
  if (accent && ACCENT_BAR[accent]) return ACCENT_BAR[accent];
  return ACCENT_BAR.slate;
}

function ToolCard({
  icon,
  title,
  description,
  to,
  cta,
  showDraftBadge,
  featured,
  accent,
}) {
  const pad = featured ? "p-6" : "p-5";
  const titleClass = featured
    ? "mb-2 text-lg font-semibold text-[#111827]"
    : "mb-2 text-base font-semibold text-[#111827]";
  const barColor = toolCardTopColor(!!featured, accent);

  const inner = (
    <>
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
        {showDraftBadge ? (
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-tight"
            style={{
              color: "#9A3412",
              background: "#FFFBEB",
              border: "1px solid #FDE68A",
            }}
            title="내용 수정 중"
          >
            미완성 · 수정중
          </span>
        ) : null}
      </div>
      <h3 className={titleClass}>{title}</h3>
      <p className="mb-4 text-sm leading-relaxed text-[#6B7280]">
        {description}
      </p>
      <span className="inline-flex items-center text-sm font-medium text-[#2563EB] transition-colors group-hover:text-[#1D4ED8]">
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
      <div className="group relative block overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280] transition-colors hover:border-[#BFDBFE] hover:bg-[#F8FAFC]">
        <div
          className="h-[3px] w-full shrink-0"
          style={{ backgroundColor: barColor }}
          aria-hidden
        />
        <div className={pad}>{inner}</div>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className={`group relative block overflow-hidden rounded-lg border border-[#E5E7EB] bg-white transition-colors hover:border-[#BFDBFE] hover:bg-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]`}
    >
      <div
        className="h-[3px] w-full shrink-0"
        style={{ backgroundColor: barColor }}
        aria-hidden
      />
      <div className={pad}>{inner}</div>
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
    <h2
      id={id}
      className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]"
    >
      {children}
    </h2>
  );
}

export default function Home() {
  return (
    <main className="w-full">
      <section className="mb-7" aria-label="포털 요약">
        <div className="flex overflow-hidden rounded-lg border border-[#DBEAFE] bg-[#F8FBFF]">
          <div className="w-1 shrink-0 bg-[#2563EB]" aria-hidden />
          <div className="min-w-0 flex-1 p-5 md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-6">
              <div className="min-w-0 flex-1">
                <h1 className="text-[20px] font-semibold leading-snug tracking-tight text-[#111827] md:text-[21px]">
                  필요한 행정 도구를 바로 사용하세요
                </h1>
                <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[#6B7280]">
                  학교 현장에서 자주 쓰는 업무도구를 한 화면에서 확인합니다.
                </p>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-2 md:w-auto md:items-end">
                <HomeDateTime />
                <PortalBadges />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10" aria-labelledby="primary-tools-heading">
        <SectionTitle id="primary-tools-heading">주요 도구</SectionTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          <ToolCard
            icon="🏫"
            title="학교 정보 조회"
            description="학교를 검색해 이번 달 학사일정을 달력으로 보고, 날짜를 눌러 중식 급식을 확인합니다."
            to="/school-info"
            cta="바로 가기"
            featured
          />
          <ToolCard
            icon="📋"
            title="업무별 월간 가이드"
            description="급여·지출·세입 등 업무별 월간 할 일을 한눈에"
            to="/guide"
            cta="바로 가기"
            showDraftBadge
            featured
          />
        </div>
      </section>

      <section className="mb-10" aria-labelledby="tools-programs-heading">
        <SectionTitle id="tools-programs-heading">
          업무 도우미 프로그램
        </SectionTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ToolCard
            icon="💳"
            title="카드 고지서 매칭"
            description="에듀파인 원인행위 목록과 카드 청구 내역을 대조합니다. 엑셀·CSV는 브라우저 안에서만 처리됩니다."
            to="/card-match"
            cta="바로 가기"
            accent="blue"
          />
          <ToolCard
            icon="🔢"
            title="경제적 수리한계 계산기"
            description="취득가격·내용연수·사용연수를 입력해 경제적 수리한계 금액을 계산합니다."
            to="/calculator"
            cta="바로 가기"
            accent="indigo"
          />
          <ToolCard
            icon="📦"
            title="물품대장"
            description="엑셀을 불러와 검색·상태 분류·수리한계 계산·요약 차트·보내기를 한 번에 처리합니다."
            to="/inventory"
            cta="바로 가기"
            accent="teal"
          />
          <ToolCard
            icon="🗂"
            title="편철 표지"
            description="한 줄에 하나씩 입력하고, 10행 구조 편철 옆면 표지를 미리보기·인쇄합니다. 데이터는 이 기기의 localStorage에만 저장됩니다."
            to="/archive"
            cta="바로 가기"
            accent="amber"
          />
        </div>
      </section>

      <section className="mb-14" aria-labelledby="tools-soon-heading">
        <SectionTitle id="tools-soon-heading">준비중</SectionTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ToolCard
            icon="🗓"
            title="교육행정직 업무 캘린더"
            description="NEIS 학사일정 연동, 월간·주간 뷰, 칸반 스타일 업무 관리. 소개·연결 페이지를 준비 중입니다."
            to="/calendar"
            cta="안내 보기"
            accent="slate"
          />
          <ToolCard
            icon="🛒"
            title="지마켓 장바구니 선택기"
            description="지마켓 장바구니에서 키워드로 원하는 품목만 자동 체크하는 북마클릿 설치 안내입니다."
            to="/tools"
            cta="설치 안내 보기"
            accent="slate"
          />
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-[#E5E7EB] bg-white p-4 text-sm text-[#6B7280]">
        <p className="font-medium text-[#111827]">최근 업데이트</p>
        <p className="mt-1">카드 고지서 매칭 웹앱 오픈</p>
      </section>
    </main>
  );
}
