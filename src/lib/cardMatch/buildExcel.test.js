import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";

import { buildCardMatchWorkbook } from "./buildExcel.js";

test("결과 엑셀 날짜를 시간대 영향 없는 날짜 일련번호로 저장한다", async () => {
  const output = await buildCardMatchWorkbook({
    checklist: [
      {
        일자: new Date(2026, 6, 14),
        제목: "날짜 확인",
        원인행위금액: 1000,
        대조상태: "✅ 매칭완료",
        카드상세정보: "",
        _kind: "11",
      },
    ],
    unmatchedOut: [
      { 승인일자: new Date(2026, 6, 4), 가맹점명: "나린", 이용금액: 172500 },
      { 승인일자: "전체 이용금액 합계 (검산용)", 가맹점명: "", 이용금액: 172500 },
    ],
    metrics: { total_card: 172500, find_money: 172500 },
    kindsOrdered: ["11"],
  });

  const workbook = XLSX.read(output, { type: "buffer", cellDates: false });
  assert.equal(workbook.Sheets[workbook.SheetNames[0]].A2.v, 46217);
  assert.equal(workbook.Sheets[workbook.SheetNames[0]].A2.w, "2026-07-14");
  assert.equal(workbook.Sheets[workbook.SheetNames[1]].A2.v, 46207);
  assert.equal(workbook.Sheets[workbook.SheetNames[1]].A2.w, "2026-07-04");
});
