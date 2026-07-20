import assert from "node:assert/strict";
import test from "node:test";

import { runAnalysisFromRows } from "./matchEngine.js";

function card(date, amount, merchant, cardNumber = "4140-1273-****-1742") {
  return {
    승인일자: new Date(`${date}T00:00:00`),
    이용금액: amount,
    "가맹점명/국가명": merchant,
    카드번호: cardNumber,
  };
}

function edu(date, amount, title = "테스트 원인행위") {
  return {
    일자: new Date(`${date}T00:00:00`),
    제목: title,
    원인행위금액: amount,
  };
}

test("동일 거래의 승인과 부분취소를 순액으로 매칭한다", () => {
  const result = runAnalysisFromRows(
    [edu("2026-07-06", 55670)],
    [card("2026-07-07", 89230, "옥션-옥션"), card("2026-07-07", -33560, "옥션-옥션")]
  );

  assert.equal(result.checklist[0]._kind, "split");
  assert.match(result.checklist[0].카드상세정보, /순액 55,670원/);
  assert.match(result.checklist[0].카드상세정보, /환불·조정 포함 2건/);
  assert.equal(result.metrics.find_money, 0);
});

test("전액 취소 쌍은 누락하지 않고 미매칭 합계를 0원으로 유지한다", () => {
  const result = runAnalysisFromRows(
    [edu("2026-07-02", 298530)],
    [card("2026-07-04", 172500, "나린"), card("2026-07-04", -172500, "나린")]
  );

  assert.equal(result.unmatchedOut.length - 1, 2);
  assert.equal(result.metrics.total_card, 0);
  assert.equal(result.metrics.find_money, 0);
});

test("서로 다른 가맹점의 음수 거래는 순액 매칭하지 않는다", () => {
  const result = runAnalysisFromRows(
    [edu("2026-07-06", 55670)],
    [card("2026-07-07", 89230, "가맹점 A"), card("2026-07-07", -33560, "가맹점 B")]
  );

  assert.equal(result.checklist[0]._kind, "none");
});
