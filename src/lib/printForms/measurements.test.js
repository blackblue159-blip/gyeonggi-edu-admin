import assert from "node:assert/strict";
import test from "node:test";

import { formatMillimetersAsCentimeters } from "./measurements.js";

test("밀리미터를 화면용 센티미터 값으로 표시한다", () => {
  assert.equal(formatMillimetersAsCentimeters(52), "5.2");
  assert.equal(formatMillimetersAsCentimeters(52.5), "5.25");
  assert.equal(formatMillimetersAsCentimeters(190), "19");
});
