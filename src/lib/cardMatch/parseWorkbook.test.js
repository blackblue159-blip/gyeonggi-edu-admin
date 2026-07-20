import assert from "node:assert/strict";
import test from "node:test";

import { normalizeWorkbookSheets } from "./parseWorkbook.js";

test("삼성카드의 머리글 위치와 열 이름을 자동 인식한다", () => {
  const rows = normalizeWorkbookSheets(
    [
      {
        name: "조회내역",
        rows: [
          ["삼성카드 매출건별 상세내역"],
          [null],
          ["카드번호", "상품명", "회원명", "이용일자", "이용금액", "가맹점명", "이용구분"],
          ["1234567812345678", "삼성 법인카드", "홍길동", 20260626, "10,000원", "문구점", "승인"],
          ["1234567812345678", "삼성 법인카드", "홍길동", 20260627, 5000, "취소점", "승인취소"],
        ],
      },
    ],
    "card",
    "통합명세서_매출건별상세내역.xlsx"
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].카드사, "삼성카드");
  assert.equal(rows[0].승인일자.getFullYear(), 2026);
  assert.equal(rows[0].승인일자.getMonth(), 5);
  assert.equal(rows[0].승인일자.getDate(), 26);
  assert.equal(rows[0].이용금액, 10000);
  assert.equal(rows[0]["가맹점명/국가명"], "문구점");
  assert.equal(rows[0].카드번호, "1234********5678");
  assert.equal(rows[1].이용금액, -5000);
});

test("엑셀 날짜 일련번호를 시간대와 무관한 날짜로 변환한다", () => {
  const rows = normalizeWorkbookSheets(
    [
      {
        name: "원인행위",
        rows: [
          ["일자", "제목", "원인행위금액"],
          [46217, "날짜 확인", 1000],
        ],
      },
    ],
    "edu"
  );

  assert.equal(rows[0].일자.getFullYear(), 2026);
  assert.equal(rows[0].일자.getMonth(), 6);
  assert.equal(rows[0].일자.getDate(), 14);
});

test("BC카드의 기존 열 이름도 계속 인식한다", () => {
  const rows = normalizeWorkbookSheets(
    [
      {
        name: "Sheet1",
        rows: [
          ["승인일자", "이용금액", "가맹점명/국가명"],
          ["2026-06-10", 25000, "테스트 상점"],
        ],
      },
    ],
    "card",
    "BC카드_청구명세서.xlsx"
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].카드사, "BC카드");
  assert.equal(rows[0].이용금액, 25000);
  assert.equal(rows[0]["가맹점명/국가명"], "테스트 상점");
});

test("에듀파인 원인행위 열의 별칭을 표준 열로 바꾼다", () => {
  const rows = normalizeWorkbookSheets(
    [
      {
        name: "원인행위",
        rows: [
          ["보고서"],
          ["원인행위일자", "건명", "원인행위 금액"],
          ["2026.06.26", "사무용품 구입", "35,000"],
        ],
      },
    ],
    "edu"
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].제목, "사무용품 구입");
  assert.equal(rows[0].원인행위금액, 35000);
  assert.equal(rows[0].일자.getFullYear(), 2026);
});
