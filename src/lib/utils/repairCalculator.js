/**
 * 경제적 수리한계(경기도교육청 지침) 계산 유틸.
 *
 * 구간 판정(usedYears: 취득 후 경과연수, 소수 가능):
 * - 최초연도: usedYears < 1  -> 취득가 × 70%
 * - 최종연도 및 초과: usedYears >= (lifeYears - 1) -> 취득가 × 20%
 * - 중간연도: 그 외 -> 중간연도 공식
 *
 * @param {{ price: number, lifeYears: number, usedYears: number }} input
 * @returns {{ limitAmount: number, status: "최초연도" | "중간연도" | "최종연도", description: string } | null}
 */
export function calcEconomicRepairLimit(input) {
  const price = input?.price;
  const lifeYears = input?.lifeYears;
  const usedYears = input?.usedYears;

  if (!Number.isFinite(price) || !Number.isFinite(lifeYears) || !Number.isFinite(usedYears)) return null;
  if (price < 0 || lifeYears <= 0 || usedYears < 0) return null;

  // 최초연도 우선(내용연수 1년 등 특이 케이스에서 최종연도 조건이 과도하게 참이 되는 것 방지)
  if (usedYears < 1) {
    return {
      limitAmount: price * 0.7,
      status: "최초연도",
      description: "취득 후 1년 미만(최초연도): 취득가격 × 70%",
    };
  }

  const finalThreshold = lifeYears - 1;
  if (usedYears >= finalThreshold) {
    const exceeded = usedYears >= lifeYears;
    return {
      limitAmount: price * 0.2,
      status: "최종연도",
      description: exceeded
        ? "내용연수 도달/초과(최종연도): 취득가격 × 20% (내용연수 초과 포함)"
        : "내용연수 도달 시작(최종연도): 취득가격 × 20%",
    };
  }

  // 중간연도 공식
  const v = price * 0.7 - (usedYears * price) / (lifeYears * 2);
  return {
    limitAmount: v,
    status: "중간연도",
    description: "중간연도: 취득가격×70% − (사용연수×취득가격)/(내용연수×2)",
  };
}

