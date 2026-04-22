import { useCallback, useMemo, useState } from "react";

export default function Tools() {
  const bookmarkletHref = useMemo(
    () =>
      `javascript:(function(){  var input = prompt("선택할 품목들을 입력하세요 (공백/쉼표 가능):");  if (!input) return;  var kws = input.split(/[\\s,]+/).filter(s => s.trim().length > 0);  var cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));  var count = 0;  cbs.forEach(cb => {    var container = cb.parentElement;    while (container) {      var parent = container.parentElement;      if (!parent || parent.tagName === 'BODY') break;      if (parent.querySelectorAll('input[type="checkbox"]').length > 1) break;      container = parent;    }    var shouldBeChecked = false;    if (container) {      /* 1. 상품명 구역 찾기 */      var rawName = container.innerText || "";      var nameEl = container.querySelector('.item_name, .info__name, .name, a[href*="goods.gmarket.co.kr"]');      if (nameEl) rawName = nameEl.innerText;      var txtNoSpace = rawName.replace(/\\s/g, '').toLowerCase();            /* 2. 지마켓 상품명을 기호와 띄어쓰기 기준으로 '단어'로 쪼갭니다 */      /* (숫자만 있는 단어는 오작동을 막기 위해 제외하고, 글자가 포함된 2글자 이상 단어만 추출) */      var siteTokens = rawName.split(/[^a-zA-Z0-9가-힣]+/).filter(t => t.length >= 2 && /[가-힣a-zA-Z]/.test(t));      shouldBeChecked = kws.some(kw => {        var kwClean = kw.replace(/\\s/g, '').toLowerCase();        if (kwClean.length === 0) return false;                /* 조건 A: 기존처럼 상품명이 키워드를 포함하는지 확인 */        if (txtNoSpace.includes(kwClean)) return true;                /* 조건 B: 쪼개진 '단어' 중 하나라도 주무관님의 긴 입력값 안에 쏙 들어가는지 확인 */        for (var i = 0; i < siteTokens.length; i++) {          if (kwClean.includes(siteTokens[i].toLowerCase())) return true;        }        return false;      });    }    /* 3. 체크 및 해제 */    if (shouldBeChecked && !cb.checked && !cb.disabled) {      cb.click();      count++;    } else if (!shouldBeChecked && cb.checked && !cb.disabled) {      cb.click();    }  });  alert("단어 쪼개기 매칭 완료! " + count + "개의 품목을 찾아냈습니다.");})();`,
    []
  );

  const [copyState, setCopyState] = useState("idle");

  const copyBookmarklet = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletHref);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1200);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 1600);
    }
  }, [bookmarkletHref]);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#787774]">도구</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#37352f]">지마켓 장바구니 선택기</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#787774]">
          지마켓 장바구니에서 원하는 품목만 키워드로 찾아 자동 체크(선택)합니다. 설치는 북마클릿(북마크) 방식이며, 이 페이지에서
          드래그해서 추가할 수 있습니다.
        </p>
      </header>

      <section className="space-y-4">
        <div className="rounded-xl border border-[#e9e9e7] bg-white p-5 shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
          <h2 className="text-base font-semibold text-[#37352f]">설치 방법</h2>
          <ol className="mt-3 space-y-2 text-sm text-[#5c5b57]">
            <li>
              - <span className="font-medium text-[#37352f]">브라우저 북마크바</span>를 켭니다. (Chrome:{" "}
              <span className="font-mono">Ctrl+Shift+B</span>)
            </li>
            <li>
              - 아래 <span className="font-medium text-[#37352f]">코드 복사</span> 버튼을 눌러 코드(주소)를 복사합니다.
            </li>
            <li>
              - 북마크바 빈 곳을 <span className="font-medium text-[#37352f]">우클릭 → “북마크 추가”</span>
            </li>
            <li>
              - 이름: <span className="font-medium text-[#37352f]">지마켓 장바구니 선택기</span>
            </li>
            <li>
              - URL(주소) 칸에 <span className="font-medium text-[#37352f]">복사한 코드</span>를 붙여넣고 저장합니다.
            </li>
          </ol>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={copyBookmarklet}
              className="inline-flex w-full items-center justify-center rounded-md bg-[#2383e2] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a6ec4] sm:w-auto"
            >
              {copyState === "copied" ? "복사됨" : copyState === "failed" ? "복사 실패(직접 복사)" : "코드 복사"}
            </button>
            <span className="text-xs text-[#787774]">
              클립보드가 막히면 아래 <span className="font-medium text-[#37352f]">코드 보기</span>에서 직접 복사하세요.
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={bookmarkletHref}
              draggable
              className="inline-flex w-full items-center justify-center rounded-md border border-[#e9e9e7] bg-[#f7f6f3] px-4 py-2 text-sm font-semibold text-[#37352f] shadow-sm transition hover:bg-[#ececea] sm:w-auto"
              title="북마크바로 드래그해서 설치"
              onClick={(e) => {
                // 일부 브라우저는 페이지에서 javascript: 실행을 막습니다. 설치는 드래그를 권장합니다.
                e.preventDefault();
              }}
            >
              (보조) 드래그로 설치
            </a>
            <span className="text-xs text-[#787774]">
              드래그 설치는 브라우저/정책에 따라 막힐 수 있어요. 위의 <span className="font-medium text-[#37352f]">복사→북마크 추가</span>{" "}
              방식이 가장 안정적입니다.
            </span>
          </div>

          <details className="mt-4 rounded-lg border border-[#e9e9e7] bg-[#fbfbfa] p-3">
            <summary className="cursor-pointer select-none text-sm font-medium text-[#37352f]">
              코드 보기(복사/확인용)
            </summary>
            <textarea
              className="mt-3 h-40 w-full resize-y rounded-md border border-[#e9e9e7] bg-white px-3 py-2 font-mono text-[12px] text-[#37352f] outline-none focus:border-[#2383e2] focus:ring-2 focus:ring-[#2383e2]/20"
              readOnly
              value={bookmarkletHref}
            />
          </details>
        </div>

        <div className="rounded-xl border border-[#e9e9e7] bg-white p-5 shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
          <h2 className="text-base font-semibold text-[#37352f]">지원 쇼핑몰</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#5c5b57]">
            <li>
              - <span className="font-medium text-[#37352f]">지마켓</span> ✅ <span className="text-[#787774]">(정상 작동)</span>
            </li>
            <li>
              - <span className="font-medium text-[#37352f]">옥션</span> 🔶{" "}
              <span className="text-[#787774]">(대부분 작동, 오류 있을 수 있음)</span>
            </li>
            <li>
              - <span className="font-medium text-[#37352f]">11번가</span> 🔶{" "}
              <span className="text-[#787774]">(대부분 작동, 오류 있을 수 있음)</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-[#f4d38a] bg-[#fff7e6] p-5 shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
          <h2 className="text-base font-semibold text-[#7a4b00]">주의사항</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#7a4b00]">
            ⚠️ 키워드가 포함된 유사 상품도 함께 체크될 수 있습니다. 반드시 선택 결과를 확인 후 주문하세요.
          </p>
        </div>

        <div className="rounded-xl border border-[#e9e9e7] bg-white p-5 shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
          <h2 className="text-base font-semibold text-[#37352f]">사용 방법</h2>
          <ol className="mt-3 space-y-2 text-sm text-[#5c5b57]">
            <li>- 지마켓 장바구니 페이지를 엽니다.</li>
            <li>- 북마크바에서 설치한 북마클릿을 클릭합니다.</li>
            <li>
              - 키워드를 입력합니다 (공백/쉼표 가능). 예: <span className="font-medium text-[#37352f]">쌀, 복사지, A4</span>
            </li>
            <li>- 자동으로 해당 품목만 체크됩니다.</li>
          </ol>
        </div>
      </section>
    </main>
  );
}

