import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const printFormsCssUrl = new URL("../../pages/PrintForms.css", import.meta.url);

test("인쇄할 때 화면 미리보기 여백을 제거한다", async () => {
  const css = await readFile(printFormsCssUrl, "utf8");
  const printMedia = css.slice(css.lastIndexOf("@media print"));

  assert.match(
    printMedia,
    /\.print-preview\s*\{[^}]*padding:\s*0\s*;/s,
    "화면용 미리보기 여백이 인쇄 영역에 남으면 빈 페이지가 생길 수 있습니다.",
  );
});
