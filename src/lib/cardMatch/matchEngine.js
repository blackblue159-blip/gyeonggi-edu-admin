import {
  CARD_MERCHANT_SOURCE,
  DATE_WINDOW_AFTER,
  DATE_WINDOW_BEFORE,
  EDU_SUBTOTAL_KEYWORDS,
  MATCH_KIND_11,
  MATCH_KIND_NONE,
  MATCH_KIND_SPLIT,
  SLIM_EDU_COLUMNS,
} from "./constants.js";

/** @param {Date} d */
export function stripTime(d) {
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  return x;
}

/** @param {Date} a @param {Date} b */
export function daysBetween(a, b) {
  const ua = stripTime(a).getTime();
  const ub = stripTime(b).getTime();
  return Math.round((ua - ub) / 86400000);
}

/** @param {Date} d */
export function dateKey(d) {
  const x = stripTime(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** @param {unknown} val */
export function normalizeCardApprovalDate(val) {
  if (val == null || val === "") return null;
  if (val instanceof Date && !Number.isNaN(val.getTime())) return stripTime(val);
  if (typeof val === "number" && Number.isFinite(val)) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const ms = epoch.getTime() + val * 86400000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return stripTime(d);
  }
  const s = String(val).trim().replace(/\./g, "-");
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return stripTime(d);
}

/** @param {unknown} v */
export function toIntAmount(v) {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  const s = String(v).replace(/,/g, "").trim();
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? 0 : n;
}

/** @param {unknown} val */
export function parseEduDate(val) {
  if (val instanceof Date && !Number.isNaN(val.getTime())) return stripTime(val);
  if (typeof val === "number" && Number.isFinite(val)) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const ms = epoch.getTime() + val * 86400000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return stripTime(d);
  }
  const s = String(val).trim().replace(/\./g, "-");
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return stripTime(d);
}

/**
 * @param {Record<string, unknown>[]} rows
 */
export function filterEduExpenseRows(rows) {
  if (!rows.length) return [];
  if (!("일자" in rows[0])) return rows.map((r) => ({ ...r }));

  const withDates = rows
    .map((r) => ({ ...r, _일자파싱: parseEduDate(r["일자"]) }))
    .filter((r) => r._일자파싱 != null);

  let out = withDates.map(({ _일자파싱, ...r }) => ({ ...r, 일자: r["일자"] }));

  if (out.length && "번호" in out[0]) {
    out = out.filter((r) => {
      const num = r["번호"];
      if (typeof num === "number" && Number.isFinite(num)) return true;
      const s = String(num ?? "")
        .trim()
        .toLowerCase();
      return s !== "" && s !== "nan" && s !== "none" && s !== "<na>" && s !== "nat";
    });
  }

  const textParts = [];
  if (out.length && "제목" in out[0]) textParts.push(out.map((r) => String(r["제목"] ?? "")));
  if (out.length && "품명" in out[0]) textParts.push(out.map((r) => String(r["품명"] ?? "")));

  if (textParts.length) {
    const combined = textParts.reduce((acc, col) => {
      if (!acc) return col.map((c) => c);
      return acc.map((a, i) => `${a} ${col[i]}`);
    }, null);
    const bad = combined.map((line) =>
      EDU_SUBTOTAL_KEYWORDS.some((kw) => line.includes(kw))
    );
    out = out.filter((_, i) => !bad[i]);
  }

  return out;
}

/**
 * @param {Record<string, unknown>[]} rows
 */
export function loadCard(rows) {
  const rawIn = rows.filter((r) => r["승인일자"] != null && String(r["승인일자"]).trim() !== "");

  const raw = [];
  const work = [];

  for (let i = 0; i < rawIn.length; i++) {
    const r = rawIn[i];
    const 승인일자 = normalizeCardApprovalDate(r["승인일자"]);
    if (승인일자 == null) continue;
    const idx = raw.length;
    const merchant = String(r[CARD_MERCHANT_SOURCE] ?? "");
    const 금액 = toIntAmount(r["이용금액"]);
    raw.push({ ...r, _idx: idx });
    work.push({ idx, 승인일자, 금액, merchant, raw: r });
  }

  return { raw, work };
}

/**
 * @param {Record<string, unknown>[]} rows
 */
export function loadEdu(rows) {
  const filtered = filterEduExpenseRows(rows);
  const raw = filtered.map((r) => ({ ...r }));
  const work = raw.map((r, idx) => ({
    idx,
    _일자: parseEduDate(r["일자"]),
    _금액: toIntAmount(r["원인행위금액"]),
    raw: r,
  }));
  return { raw, work };
}

/**
 * @param {import('./matchEngine.js').CardWorkRow} row
 */
function cardDetail11(row) {
  const ds = row.승인일자 ? dateKey(row.승인일자) : "";
  return `${ds} / ${row.merchant} / ${row.금액.toLocaleString("ko-KR")}원 (1:1)`;
}

/**
 * @param {import('./matchEngine.js').CardWorkRow[]} subSorted
 * @param {string} merchant
 * @param {number} total
 */
function cardDetailSplit(subSorted, merchant, total) {
  const parts = subSorted.map((r) => {
    const ds = r.승인일자 ? dateKey(r.승인일자) : "";
    return `${ds} ${r.금액.toLocaleString("ko-KR")}원`;
  });
  const n = subSorted.length;
  return `${parts.join(" + ")} / ${merchant} / 합계 ${total.toLocaleString("ko-KR")}원 (분할 ${n}건)`;
}

/**
 * @param {Date[]} 승인일자List
 * @param {Date} eDate
 */
function dateWindowMaskRow(승인일자, eDate) {
  const lo = new Date(eDate.getTime());
  lo.setDate(lo.getDate() - DATE_WINDOW_BEFORE);
  const hi = new Date(eDate.getTime());
  hi.setDate(hi.getDate() + DATE_WINDOW_AFTER);
  const t = stripTime(승인일자).getTime();
  return t >= stripTime(lo).getTime() && t <= stripTime(hi).getTime();
}

/**
 * @param {Map<number, import('./matchEngine.js').CardWorkRow>} cardByIdx
 * @param {number[]} idxs
 * @param {Date} eDate
 */
function splitComboDateKey(cardByIdx, idxs, eDate) {
  const e0 = stripTime(eDate);
  let s = 0;
  let mx = 0;
  for (const i of idxs) {
    const r = cardByIdx.get(i);
    if (!r || r.승인일자 == null) return [1e9, 1e9];
    const days = Math.abs(daysBetween(r.승인일자, e0));
    s += days;
    mx = Math.max(mx, days);
  }
  return [s, mx];
}

/**
 * @param {import('./matchEngine.js').CardWorkRow[]} sub
 */
function splitComboMerchantLabel(sub) {
  const names = sub.map((x) => String(x.merchant ?? "").trim());
  const unique = [...new Set(names)];
  const mer = unique.join(" / ");
  return mer || String(sub[0]?.merchant ?? "");
}

/**
 * @param {import('./matchEngine.js').CardWorkRow[]} winRows
 * @param {number} targetAmt
 * @param {Date} eDate
 */
function findSameDaySumMatch(winRows, targetAmt, eDate) {
  if (winRows.length === 0) return null;
  const byDay = new Map();
  for (const r of winRows) {
    const k = dateKey(r.승인일자);
    if (!byDay.has(k)) byDay.set(k, { sum: 0, count: 0, idxs: [], dayStr: k });
    const g = byDay.get(k);
    g.sum += r.금액;
    g.count += 1;
    g.idxs.push(r.idx);
  }
  const candidates = [];
  for (const [, g] of byDay) {
    if (g.sum === targetAmt && g.count >= 2) candidates.push(g);
  }
  if (candidates.length === 0) return null;
  const e0 = stripTime(eDate);
  const best = candidates.reduce((a, b) => {
    const da = Math.abs(daysBetween(new Date(`${a.dayStr}T00:00:00`), e0));
    const db = Math.abs(daysBetween(new Date(`${b.dayStr}T00:00:00`), e0));
    return db < da ? b : a;
  });
  return best.idxs.length >= 2 ? best.idxs : null;
}

/**
 * @param {import('./matchEngine.js').CardWorkRow[]} winRows
 * @param {number} targetAmt
 * @param {Date} eDate
 * @param {Map<number, import('./matchEngine.js').CardWorkRow>} cardByIdx
 */
function findSplitMatch(winRows, targetAmt, eDate, cardByIdx) {
  if (winRows.length < 2) return null;

  const items = winRows
    .map((r) => [r.idx, r.금액])
    .sort((a, b) => b[1] - a[1]);
  const n = items.length;

  const posByAmt = new Map();
  for (let pos = 0; pos < n; pos++) {
    const amt = items[pos][1];
    if (!posByAmt.has(amt)) posByAmt.set(amt, []);
    posByAmt.get(amt).push(pos);
  }

  let bestPairKey = null;
  let bestPairPos = null;

  for (let pos_i = 0; pos_i < n; pos_i++) {
    const idx_i = items[pos_i][0];
    const ai = items[pos_i][1];
    const need = targetAmt - ai;
    for (const pos_j of posByAmt.get(need) ?? []) {
      if (pos_j <= pos_i) continue;
      const idx_j = items[pos_j][0];
      if (idx_i === idx_j) continue;
      const aj = items[pos_j][1];
      const hi = ai >= aj ? ai : aj;
      const lo = ai >= aj ? aj : ai;
      const [ds, dm] = splitComboDateKey(cardByIdx, [idx_i, idx_j], eDate);
      const candKey = [ds, dm, -hi, -lo];
      if (
        bestPairKey == null ||
        candKey[0] < bestPairKey[0] ||
        (candKey[0] === bestPairKey[0] && candKey[1] < bestPairKey[1]) ||
        (candKey[0] === bestPairKey[0] &&
          candKey[1] === bestPairKey[1] &&
          candKey[2] < bestPairKey[2]) ||
        (candKey[0] === bestPairKey[0] &&
          candKey[1] === bestPairKey[1] &&
          candKey[2] === bestPairKey[2] &&
          candKey[3] < bestPairKey[3])
      ) {
        bestPairKey = candKey;
        bestPairPos = [pos_i, pos_j];
      }
    }
  }

  if (bestPairPos != null) {
    const [pos_i, pos_j] = bestPairPos;
    const i = items[pos_i][0];
    const j = items[pos_j][0];
    const sub = [cardByIdx.get(i), cardByIdx.get(j)].filter(Boolean);
    sub.sort((a, b) => a.승인일자.getTime() - b.승인일자.getTime());
    return { combo: [i, j], merchant: splitComboMerchantLabel(sub) };
  }

  let bestTripleKey = null;
  let bestTriplePos = null;

  for (let pos_i = 0; pos_i < n; pos_i++) {
    const ai = items[pos_i][1];
    if (ai > targetAmt) continue;
    for (let pos_j = pos_i + 1; pos_j < n; pos_j++) {
      const need = targetAmt - ai - items[pos_j][1];
      for (const pos_k of posByAmt.get(need) ?? []) {
        if (pos_k <= pos_j) continue;
        const idx_i = items[pos_i][0];
        const idx_j = items[pos_j][0];
        const idx_k = items[pos_k][0];
        if (new Set([idx_i, idx_j, idx_k]).size < 3) continue;
        const a2 = items[pos_j][1];
        const a3 = need;
        const amts = [ai, a2, a3].sort((x, y) => y - x);
        const [ds, dm] = splitComboDateKey(cardByIdx, [idx_i, idx_j, idx_k], eDate);
        const candKey = [ds, dm, -amts[0], -amts[1], -amts[2]];
        if (
          bestTripleKey == null ||
          candKey[0] < bestTripleKey[0] ||
          (candKey[0] === bestTripleKey[0] && candKey[1] < bestTripleKey[1]) ||
          (candKey[0] === bestTripleKey[0] &&
            candKey[1] === bestTripleKey[1] &&
            candKey[2] < bestTripleKey[2]) ||
          (candKey[0] === bestTripleKey[0] &&
            candKey[1] === bestTripleKey[1] &&
            candKey[2] === bestTripleKey[2] &&
            candKey[3] < bestTripleKey[3]) ||
          (candKey[0] === bestTripleKey[0] &&
            candKey[1] === bestTripleKey[1] &&
            candKey[2] === bestTripleKey[2] &&
            candKey[3] === bestTripleKey[3] &&
            candKey[4] < bestTripleKey[4])
        ) {
          bestTripleKey = candKey;
          bestTriplePos = [pos_i, pos_j, pos_k];
        }
      }
    }
  }

  if (bestTriplePos != null) {
    const [pos_i, pos_j, pos_k] = bestTriplePos;
    const i = items[pos_i][0];
    const j = items[pos_j][0];
    const k = items[pos_k][0];
    const sub = [cardByIdx.get(i), cardByIdx.get(j), cardByIdx.get(k)].filter(Boolean);
    sub.sort((a, b) => a.승인일자.getTime() - b.승인일자.getTime());
    return { combo: [i, j, k], merchant: splitComboMerchantLabel(sub) };
  }

  return null;
}

/**
 * @param {import('./matchEngine.js').CardWorkRow[]} cardWork
 * @param {import('./matchEngine.js').EduWorkRow[]} eduWork
 * @param {Set<number>} matchedCard
 */
function eduCard11Edges(cardWork, eduWork, matchedCard) {
  /** @type {[number, number, number][]} */
  const edges = [];
  for (const ew of eduWork) {
    const e_idx = ew.idx;
    const e_date = ew._일자;
    const e_amt = ew._금액;
    if (e_date == null) continue;
    const pool = cardWork.filter((c) => !matchedCard.has(c.idx));
    const win = pool.filter((c) => dateWindowMaskRow(c.승인일자, e_date));
    const hit = win.filter((c) => c.금액 === e_amt);
    const e0 = stripTime(e_date);
    for (const c of hit) {
      const dRaw = c.승인일자;
      const days =
        dRaw == null ? 1e9 : Math.abs(daysBetween(dRaw, e0));
      edges.push([days, e_idx, c.idx]);
    }
  }
  return edges;
}

/**
 * @param {import('./matchEngine.js').CardWorkRow[]} cardWork
 * @param {import('./matchEngine.js').EduWorkRow[]} eduWork
 */
function assign11MinDaydiffGlobal(cardWork, eduWork) {
  const matchedCard = new Set();
  /** @type {Record<number, string>} */
  const kind = {};
  /** @type {Record<number, string>} */
  const detail = {};

  const edges = eduCard11Edges(cardWork, eduWork, new Set());
  edges.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] - b[0];
    if (a[1] !== b[1]) return a[1] - b[1];
    return a[2] - b[2];
  });

  const usedEdu = new Set();
  for (const [days, e_idx, c_idx] of edges) {
    void days;
    if (usedEdu.has(e_idx) || matchedCard.has(c_idx)) continue;
    usedEdu.add(e_idx);
    matchedCard.add(c_idx);
    kind[e_idx] = MATCH_KIND_11;
    const row = cardWork.find((c) => c.idx === c_idx);
    detail[e_idx] = row ? cardDetail11(row) : "";
  }
  return { kind, detail, matchedCard };
}

/**
 * @param {import('./matchEngine.js').CardWorkRow[]} cardWork
 * @param {import('./matchEngine.js').EduWorkRow[]} eduWork
 */
export function findMatches(cardWork, eduWork) {
  const { kind, detail, matchedCard } = assign11MinDaydiffGlobal(cardWork, eduWork);

  for (const ew of eduWork) {
    if (!(ew.idx in kind) && ew._일자 == null) {
      kind[ew.idx] = MATCH_KIND_NONE;
      detail[ew.idx] = "";
    }
  }

  const cardByIdx = new Map(cardWork.map((c) => [c.idx, c]));

  const eduIndices = eduWork.map((e) => e.idx);

  for (const e_idx of eduIndices) {
    if (e_idx in kind) continue;

    const ew = eduWork.find((e) => e.idx === e_idx);
    if (!ew) continue;
    const e_date = ew._일자;
    const e_amt = ew._금액;

    const pool = cardWork.filter((c) => !matchedCard.has(c.idx));
    const win = pool.filter((c) => dateWindowMaskRow(c.승인일자, e_date));

    if (win.length >= 2) {
      const gotSameDay = findSameDaySumMatch(win, e_amt, e_date);
      if (gotSameDay != null) {
        const subRows = gotSameDay.map((idx) => cardByIdx.get(idx)).filter(Boolean);
        subRows.sort((a, b) => a.승인일자.getTime() - b.승인일자.getTime());
        const merchant = splitComboMerchantLabel(subRows);
        for (const c_idx of gotSameDay) matchedCard.add(c_idx);
        kind[e_idx] = MATCH_KIND_SPLIT;
        detail[e_idx] = cardDetailSplit(subRows, merchant, e_amt);
        continue;
      }

      const got = findSplitMatch(win, e_amt, e_date, cardByIdx);
      if (got != null) {
        const subRows = got.combo.map((idx) => cardByIdx.get(idx)).filter(Boolean);
        subRows.sort((a, b) => a.승인일자.getTime() - b.승인일자.getTime());
        for (const c_idx of got.combo) matchedCard.add(c_idx);
        kind[e_idx] = MATCH_KIND_SPLIT;
        detail[e_idx] = cardDetailSplit(subRows, got.merchant, e_amt);
        continue;
      }
    }

    kind[e_idx] = MATCH_KIND_NONE;
    detail[e_idx] = "";
  }

  return { kind, detail, matchedCard };
}

/**
 * @param {string} 매칭종류
 */
export function 대조상태표시(매칭종류) {
  if (매칭종류 === MATCH_KIND_11) return "✅ 매칭완료";
  if (매칭종류 === MATCH_KIND_SPLIT) return "🟡 합산일치";
  return "❌ 확인필요";
}

/**
 * @param {import('./matchEngine.js').CardWorkRow[]} cardWork
 * @param {Set<number>} usedCards
 */
export function computeVerificationMetrics(cardWork, usedCards) {
  const totalCard = cardWork.reduce((s, r) => s + r.금액, 0);
  let matchedCard = 0;
  for (const c of usedCards) {
    const row = cardWork.find((r) => r.idx === c);
    if (row) matchedCard += row.금액;
  }
  return {
    total_card: totalCard,
    find_money: totalCard - matchedCard,
  };
}

/**
 * @param {Record<string, unknown>[]} eduRowsParsed
 * @param {Record<string, unknown>[]} cardRowsParsed
 */
export function runAnalysisFromRows(eduRowsParsed, cardRowsParsed) {
  const eduKeys = new Set(Object.keys(eduRowsParsed[0] || {}));
  for (const col of SLIM_EDU_COLUMNS) {
    if (!eduKeys.has(col)) {
      throw new Error(`원인행위 파일에 필요한 열이 없습니다: ${col}`);
    }
  }
  const cardKeys = new Set(Object.keys(cardRowsParsed[0] || {}));
  if (!cardKeys.has(CARD_MERCHANT_SOURCE)) {
    throw new Error(`카드 파일에 '${CARD_MERCHANT_SOURCE}' 열이 없습니다.`);
  }
  if (!cardKeys.has("승인일자") || !cardKeys.has("이용금액")) {
    throw new Error("카드 파일에 '승인일자', '이용금액' 열이 필요합니다.");
  }

  const { raw: cardOrig, work: cardWork } = loadCard(cardRowsParsed);
  const { raw: eduOrig, work: eduWork } = loadEdu(eduRowsParsed);

  const { kind: kindMap, detail: matchDetail, matchedCard: usedCards } = findMatches(
    cardWork,
    eduWork
  );

  const checklist = eduOrig.map((row, i) => ({
    일자: row["일자"],
    제목: row["제목"],
    원인행위금액: toIntAmount(row["원인행위금액"]),
    대조상태: 대조상태표시(kindMap[i] ?? MATCH_KIND_NONE),
    카드상세정보: matchDetail[i] ?? "",
    _kind: kindMap[i] ?? MATCH_KIND_NONE,
  }));

  const unmatchedCard = cardOrig.filter((r) => !usedCards.has(r._idx));
  const unmatchedSlim = unmatchedCard.map((r) => ({
    승인일자: r["승인일자"],
    가맹점명: String(r[CARD_MERCHANT_SOURCE] ?? ""),
    이용금액: toIntAmount(r["이용금액"]),
  }));

  const umTotal = unmatchedSlim.reduce((s, r) => s + r.이용금액, 0);
  const unmatchedOut = [
    ...unmatchedSlim,
    {
      승인일자: "전체 이용금액 합계 (검산용)",
      가맹점명: "",
      이용금액: umTotal,
    },
  ];

  const metrics = computeVerificationMetrics(cardWork, usedCards);

  return {
    checklist,
    unmatchedOut,
    metrics,
    kindsOrdered: checklist.map((r) => r._kind),
  };
}
