import { useCallback, useMemo, useState } from "react";

export default function Tools() {
  const bookmarkletCode = useMemo(
    () =>
      `javascript:(function(){  var input = prompt("선택할 품목들을 입력하세요 (공백/쉼표 가능):");  if (!input) return;  var kws = input.split(/[\\s,]+/).filter(s => s.trim().length > 0);  var cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));  var count = 0;  cbs.forEach(cb => {    var container = cb.parentElement;    while (container) {      var parent = container.parentElement;      if (!parent || parent.tagName === 'BODY') break;      if (parent.querySelectorAll('input[type="checkbox"]').length > 1) break;      container = parent;    }    var shouldBeChecked = false;    if (container) {      var rawName = container.innerText || "";      var nameEl = container.querySelector('.item_name, .info__name, .name, a[href*="goods.gmarket.co.kr"]');      if (nameEl) rawName = nameEl.innerText;      var txtNoSpace = rawName.replace(/\\s/g, '').toLowerCase();      var siteTokens = rawName.split(/[^a-zA-Z0-9가-힣]+/).filter(t => t.length >= 2 && /[가-힣a-zA-Z]/.test(t));      shouldBeChecked = kws.some(kw => {        var kwClean = kw.replace(/\\s/g, '').toLowerCase();        if (kwClean.length === 0) return false;        if (txtNoSpace.includes(kwClean)) return true;        for (var i = 0; i < siteTokens.length; i++) {          if (kwClean.includes(siteTokens[i].toLowerCase())) return true;        }        return false;      });    }    if (shouldBeChecked && !cb.checked && !cb.disabled) {      cb.click();      count++;    } else if (!shouldBeChecked && cb.checked && !cb.disabled) {      cb.click();    }  });  alert("매칭 완료! " + count + "개의 품목을 선택했습니다.");})();`,
    []
  );

  const [copyState, setCopyState] = useState("idle");

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletCode);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }, [bookmarkletCode]);

  const steps = [
    {
      num: 1,
      title: "북마크바 켜기",
      desc: (
        <>
          크롬에서 <kbd className="rounded border border-[#d0cfc9] bg-[#f7f6f3] px-1.5 py-0.5 font-mono text-xs text-[#37352f]">Ctrl</kbd>{" "}
          +{" "}
          <kbd className="rounded border border-[#d0cfc9] bg-[#f7f6f3] px-1.5 py-0.5 font-mono text-xs text-[#37352f]">Shift</kbd>{" "}
          +{" "}
          <kbd className="rounded border border-[#d0cfc9] bg-[#f7f6f3] px-1.5 py-0.5 font-mono text-xs text-[#37352f]">B</kbd>
          를 눌러 북마크바를 표시합니다.
        </>
      ),
    },
    {
      num: 2,
      title: "코드 복사",
      desc: "아래 파란 버튼을 클릭해 코드를 복사합니다.",
      action: true,
    },
    {
      num: 3,
      title: "북마크 추가",
      desc: (
        <>
          북마크바 빈 곳에서{" "}
          <span className="font-medium text-[#37352f]">우클릭 → 북마크 추가</span>를 선택합니다.
        </>
      ),
    },
    {
      num: 4,
      title: "이름 · URL 입력 후 저장",
      desc: (
        <>
          이름은 자유롭게, <span className="font-medium text-[#37352f]">URL 칸에 복사한 코드를 붙여넣기</span>{" "}
          (<kbd className="rounded border border-[#d0cfc9] bg-[#f7f6f3] px-1.5 py-0.5 font-mono text-xs text-[#37352f]">Ctrl+V</kbd>)
          하고 저장합니다.
        </>
      ),
    },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#787774]">도구</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#37352f]">장바구니 선택기</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#787774]">
          지마켓 등 쇼핑몰 장바구니에서 원하는 품목만 키워드로 찾아 자동 체크합니다.
          북마클릿(북마크) 방식으로 한 번 설치하면 계속 사용할 수 있습니다.
        </p>
      </header>

      <section className="space-y-4">
        {/* 설치 방법 */}
        <div className="rounded-xl border border-[#e9e9e7] bg-white p-5 shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
          <h2 className="text-base font-semibold text-[#37352f]">설치 방법</h2>

          <ol className="mt-4 space-y-4">
            {steps.map((step) => (
              <li key={step.num} className="flex gap-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2383e2] text-xs font-bold text-white">
                  {step.num}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#37352f]">{step.title}</p>
                  <p className="mt-0.5 text-sm text-[#5c5b57]">{step.desc}</p>
                  {step.action && (
                    <button
                      type="button"
                      onClick={copyCode}
                      className="mt-2 inline-flex items-center gap-2 rounded-md bg-[#2383e2] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a6ec4] active:scale-95"
                    >
                      {copyState === "copied" ? (
                        <>✓ 복사됐습니다</>
                      ) : copyState === "failed" ? (
                        <>복사 실패 — 아래 코드 보기에서 직접 복사하세요</>
                      ) : (
                        <>코드 복사</>
                      )}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <details className="mt-5 rounded-lg border border-[#e9e9e7] bg-[#fbfbfa] p-3">
            <summary className="cursor-pointer select-none text-sm font-medium text-[#37352f]">
              코드 직접 복사 (버튼이 안 될 때)
            </summary>
            <p className="mt-2 text-xs text-[#787774]">아래 전체를 선택(<kbd className="rounded border border-[#d0cfc9] bg-white px-1 font-mono">Ctrl+A</kbd>)하고 복사하세요.</p>
            <textarea
              className="mt-2 h-28 w-full resize-none rounded-md border border-[#e9e9e7] bg-white px-3 py-2 font-mono text-[11px] text-[#37352f] outline-none focus:border-[#2383e2] focus:ring-2 focus:ring-[#2383e2]/20"
              readOnly
              value={bookmarkletCode}
              onClick={(e) => e.target.select()}
            />
          </details>
        </div>

        {/* 사용 방법 */}
        <div className="rounded-xl border border-[#e9e9e7] bg-white p-5 shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
          <h2 className="text-base font-semibold text-[#37352f]">사용 방법</h2>
          <ol className="mt-3 space-y-2 text-sm text-[#5c5b57]">
            <li className="flex gap-2"><span className="font-medium text-[#37352f]">1.</span> 쇼핑몰 장바구니 페이지를 엽니다.</li>
            <li className="flex gap-2"><span className="font-medium text-[#37352f]">2.</span> 북마크바에서 설치한 북마클릿을 클릭합니다.</li>
            <li className="flex gap-2">
              <span className="font-medium text-[#37352f]">3.</span>
              <span>품목 키워드를 입력합니다. 예: <span className="font-medium text-[#37352f]">복사지, A4, 토너</span> (공백·쉼표로 구분)</span>
            </li>
            <li className="flex gap-2"><span className="font-medium text-[#37352f]">4.</span> 해당 키워드가 포함된 품목이 자동으로 체크됩니다.</li>
          </ol>
        </div>

        {/* 지원 쇼핑몰 */}
        <div className="rounded-xl border border-[#e9e9e7] bg-white p-5 shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
          <h2 className="text-base font-semibold text-[#37352f]">지원 쇼핑몰</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#5c5b57]">
            <li>✅ <span className="font-medium text-[#37352f]">지마켓</span> — 정상 작동</li>
            <li>🔶 <span className="font-medium text-[#37352f]">옥션</span> — 대부분 작동 (오류 있을 수 있음)</li>
            <li>🔶 <span className="font-medium text-[#37352f]">11번가</span> — 대부분 작동 (오류 있을 수 있음)</li>
          </ul>
        </div>

        {/* 주의사항 */}
        <div className="rounded-xl border border-[#f4d38a] bg-[#fff7e6] p-5">
          <h2 className="text-base font-semibold text-[#7a4b00]">주의사항</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#7a4b00]">
            ⚠️ 키워드가 포함된 유사 상품도 함께 체크될 수 있습니다. 반드시 선택 결과를 확인한 후 주문하세요.
          </p>
        </div>
      </section>
    </main>
  );
}
