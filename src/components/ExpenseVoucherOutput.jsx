/**
 * 편철 옆면 표지 — 웹 전용 레이아웃
 * 카드를 가로로 나열하고, 한 줄에 들어가지 않으면 flex-wrap으로 다음 줄로 배치합니다.
 */

export function effectiveBinderWidthCm(row) {
  const w = Number(row?.widthCm);
  if (!Number.isFinite(w) || w <= 0) return 3;
  return w;
}

function MetaBlock({ label, value }) {
  const v = String(value ?? "").trim();
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#787774]">{label}</p>
      <p className="mt-0.5 break-words text-[13px] font-medium leading-snug text-[#37352f]">{v || "—"}</p>
    </div>
  );
}

/** @param {{ row: { title?: string, fiscalYear?: string, yearMonth?: string, period?: string, serialLabel?: string, orgName?: string, widthCm?: number } }} props */
export function BinderSpineCard({ row }) {
  const w = effectiveBinderWidthCm(row);
  const title = String(row.title ?? "").trim();

  return (
    <div
      className="binder-spine-card flex h-full min-h-[118mm] flex-row overflow-hidden bg-white shadow-sm print:min-h-[110mm] print:shadow-none"
      style={{
        width: `${w}cm`,
        minWidth: `${w}cm`,
        border: "3px solid #37352f",
      }}
    >
      <div
        className="flex flex-[0.85] items-center justify-center border-r-[3px] border-[#37352f] bg-[#fbfbfa] px-2 py-3 print:bg-white"
        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
      >
        <span className="text-[17px] font-semibold leading-normal tracking-tight text-[#37352f]">{title || " "}</span>
      </div>
      <div className="flex min-w-0 flex-[1.15] flex-col justify-center gap-3 px-3 py-3">
        <MetaBlock label="회계연도" value={row.fiscalYear} />
        <MetaBlock label="연월" value={row.yearMonth} />
        <MetaBlock label="기간" value={row.period} />
        <MetaBlock label="일련번호" value={row.serialLabel} />
        <MetaBlock label="기관명" value={row.orgName} />
      </div>
    </div>
  );
}

/**
 * @param {{ rows: object[], forPrint?: boolean }} props
 */
export function BinderSpineGrid({ rows, forPrint = false }) {
  if (!rows.length) {
    return <p className="text-sm text-[#787774]">표지를 추가해 주세요.</p>;
  }

  return (
    <div
      className={
        forPrint
          ? "flex w-full max-w-[277mm] flex-wrap content-start items-stretch justify-start gap-4 print:max-w-none"
          : "flex flex-wrap content-start items-stretch justify-start gap-4"
      }
    >
      {rows.map((row) => (
        <BinderSpineCard key={row.id} row={row} />
      ))}
    </div>
  );
}
