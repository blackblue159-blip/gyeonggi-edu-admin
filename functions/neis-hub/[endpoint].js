/**
 * Cloudflare Pages Function — NEIS Open API 프록시 (CORS 우회).
 * 경로: /neis-hub/:endpoint → https://open.neis.go.kr/hub/:endpoint
 * 로컬: vite.config.js 의 server.proxy 가 동일 경로를 처리합니다.
 */
export async function onRequest(context) {
  const req = context.request;
  const method = req.method;

  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Accept, Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (method !== "GET" && method !== "HEAD") {
    return new Response(JSON.stringify({ error: "허용되지 않는 메서드입니다." }), {
      status: 405,
      headers: { "Content-Type": "application/json; charset=UTF-8" },
    });
  }

  const endpoint = context.params.endpoint;
  if (!endpoint || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(endpoint)) {
    return new Response(JSON.stringify({ error: "endpoint 가 필요합니다 (예: schoolInfo)" }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=UTF-8" },
    });
  }

  const url = new URL(req.url);
  const target = `https://open.neis.go.kr/hub/${endpoint}${url.search}`;

  const res = await fetch(target, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const body = method === "HEAD" ? "" : await res.text();
  return new Response(body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/json; charset=UTF-8",
      "Cache-Control": "public, max-age=30",
    },
  });
}
