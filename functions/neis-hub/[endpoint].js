/**
 * NEIS hub 프록시 (브라우저 CORS 우회).
 * calander_web/core/neis.py 와 동일하게 https://open.neis.go.kr/hub/{endpoint} 로 전달합니다.
 */
export async function onRequest(context) {
  const endpoint = context.params.endpoint;
  if (!endpoint) {
    return new Response(JSON.stringify({ error: "endpoint 가 필요합니다 (예: schoolInfo)" }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=UTF-8" },
    });
  }

  const url = new URL(context.request.url);
  const target = `https://open.neis.go.kr/hub/${endpoint}${url.search}`;

  const res = await fetch(target, {
    method: context.request.method,
    headers: {
      Accept: "application/json",
    },
  });

  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/json; charset=UTF-8",
      "Cache-Control": "public, max-age=30",
    },
  });
}
