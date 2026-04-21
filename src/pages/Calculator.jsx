import { useMemo, useState } from "react";

function parseNonNegativeNumber(input) {
  const s = String(input ?? "").replaceAll(",", "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return n;
}

function formatWon(n) {
  if (!Number.isFinite(n)) return "";
  return Math.round(n).toLocaleString("ko-KR");
}

function clampMin(n, min) {
  return n < min ? min : n;
}

export default function Calculator() {
  const [priceRaw, setPriceRaw] = useState("");
  const [lifeRaw, setLifeRaw] = useState("");
  const [usedRaw, setUsedRaw] = useState("");

  const price = useMemo(() => parseNonNegativeNumber(priceRaw), [priceRaw]);
  const life = useMemo(() => parseNonNegativeNumber(lifeRaw), [lifeRaw]);
  const used = useMemo(() => parseNonNegativeNumber(usedRaw), [usedRaw]);

  const result = useMemo(() => {
    if (price === null || life === null || used === null) return null;
    if (Number.isNaN(price) || Number.isNaN(life) || Number.isNaN(used)) return { error: "숫자만 입력해 주세요. (0 이상)" };
    if (price === 0) return { value: 0, basis: "최초연도", note: null };
    if (life <= 0) return { error: "내용연수는 0보다 커야 합니다." };
    if (used <= 0) return { error: "사용연수는 0보다 커야 합니다." };

    const usedYears = clampMin(used, 1);
    const lifeYears = life;

    if (usedYears === 1) {
      return { value: price * 0.7, basis: "최초연도", note: null };
    }

    if (usedYears >= lifeYears) {
      return {
        value: price * 0.2,
        basis: "최종연도",
        note: usedYears > lifeYears ? "사용연수가 내용연수를 초과하여 최종연도 기준을 적용했습니다." : null,
      };
    }

    const v = price * 0.7 - (usedYears * price) / (lifeYears * 2);
    return { value: v, basis: "중간연도", note: null };
  }, [price, life, used]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-[#37352f]">계산기</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#787774]">
        자주 쓰는 업무용 계산을 빠르게 처리합니다. 입력값은 브라우저에만 머무르며 서버로 전송되지 않습니다.
      </p>

      <section className="mt-8 rounded-lg border border-[#e9e9e7] bg-white p-4 shadow-[0_1px_2px_rgba(15,15,15,0.04)] sm:p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-[15px] font-semibold text-[#37352f]">경제적 수리한계 계산기</h2>
          <p className="text-[12px] text-[#787774]">
            수리비가 경제적 수리한계 금액을 초과하면 불용처분 검토가 가능합니다.
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-[12px] font-medium text-[#5c5b57]">취득가격 (원)</span>
            <input
              inputMode="numeric"
              value={priceRaw}
              onChange={(e) => setPriceRaw(e.target.value)}
              placeholder="예: 1200000"
              className="mt-1.5 w-full rounded-md border border-[#e9e9e7] bg-[#fbfbfa] px-3 py-2 text-[14px] text-[#37352f] placeholder:text-[#9b9a97] focus:border-[#2383e2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2383e2]/20"
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-medium text-[#5c5b57]">내용연수 (년)</span>
            <input
              inputMode="numeric"
              value={lifeRaw}
              onChange={(e) => setLifeRaw(e.target.value)}
              placeholder="예: 5"
              className="mt-1.5 w-full rounded-md border border-[#e9e9e7] bg-[#fbfbfa] px-3 py-2 text-[14px] text-[#37352f] placeholder:text-[#9b9a97] focus:border-[#2383e2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2383e2]/20"
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-medium text-[#5c5b57]">사용연수 (년)</span>
            <input
              inputMode="numeric"
              value={usedRaw}
              onChange={(e) => setUsedRaw(e.target.value)}
              placeholder="예: 2"
              className="mt-1.5 w-full rounded-md border border-[#e9e9e7] bg-[#fbfbfa] px-3 py-2 text-[14px] text-[#37352f] placeholder:text-[#9b9a97] focus:border-[#2383e2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2383e2]/20"
            />
          </label>
        </div>

        <div className="mt-5 rounded-lg border border-[#e9e9e7] bg-[#fbfbfa] p-4">
          {result?.error ? (
            <p className="text-[13px] text-red-900">{result.error}</p>
          ) : result ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[13px] font-medium text-[#5c5b57]">경제적 수리한계 금액</p>
                <p className="text-[18px] font-semibold tracking-tight text-[#37352f]">
                  {formatWon(result.value)}원
                </p>
              </div>
              <p className="text-[12px] text-[#787774]">
                적용 기준: <span className="font-medium text-[#37352f]">{result.basis}</span>
              </p>
              <p className="text-[12px] leading-relaxed text-[#787774]">
                수리비가 위 금액을 초과하면 <span className="font-medium text-[#37352f]">불용처분</span>이 가능할 수 있습니다.
              </p>
              {result.note ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                  {result.note}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-[13px] text-[#787774]">세 값을 입력하면 결과가 표시됩니다.</p>
          )}
        </div>

        <details className="mt-4 rounded-md border border-[#e9e9e7] bg-white px-3 py-2">
          <summary className="cursor-pointer select-none text-[13px] font-medium text-[#37352f]">
            계산식 보기
          </summary>
          <div className="mt-3 space-y-2 text-[12px] leading-relaxed text-[#5c5b57]">
            <p>
              - 사용연수 = 1 → 최초연도: 취득가격 × 70%
            </p>
            <p>
              - 사용연수 ≥ 내용연수 → 최종연도: 취득가격 × 20%
            </p>
            <p>
              - 그 외 → 중간연도: (취득가격 × 0.7) - (사용연수 × 취득가격) / (내용연수 × 2)
            </p>
          </div>
        </details>
      </section>
    </main>
  );
}

