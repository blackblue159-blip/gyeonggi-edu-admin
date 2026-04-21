import { useCallback, useEffect, useId, useRef, useState } from "react";
import { buildCardMatchWorkbook } from "../lib/cardMatch/buildExcel.js";
import { OUTPUT_FILENAME } from "../lib/cardMatch/constants.js";
import { parseDataFileToRows } from "../lib/cardMatch/parseWorkbook.js";
import { runAnalysisFromRows } from "../lib/cardMatch/matchEngine.js";

const ACCEPT = ".csv,.xlsx,.xls,.xlsm";
const ACCEPT_ATTR = `${ACCEPT},application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv`;

const ALLOWED_EXT = new Set([".csv", ".xlsx", ".xls", ".xlsm"]);

/** `public/images/` 안의 파일명과 문자 단위로 동일해야 합니다. */
const GUIDE_IMG_FILE_EDU = "원인행위목록_다운방법.png";
const GUIDE_IMG_FILE_CARD = "고지서_다운방법.png";

/** @param {string} filename public/images/ 기준 파일명(한글 포함) */
function publicImageUrl(filename) {
  return `/images/${encodeURIComponent(filename)}`;
}

const GUIDE_IMG_EDU = publicImageUrl(GUIDE_IMG_FILE_EDU);
const GUIDE_IMG_CARD = publicImageUrl(GUIDE_IMG_FILE_CARD);

/**
 * @param {{ open: boolean, src: string | null, alt: string, onClose: () => void }} props
 */
function ImageLightbox({ open, src, alt, onClose }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !src) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#0f0f0f]/70 backdrop-blur-[2px]"
        aria-label="이미지 닫기"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(92vh,920px)] w-full max-w-6xl flex-col items-center">
        <img
          src={src}
          alt={alt}
          decoding="async"
          className="max-h-[min(86vh,880px)] w-auto max-w-full rounded-lg border border-[#e9e9e7] bg-white object-contain shadow-[0_24px_64px_rgba(0,0,0,0.35)]"
        />
        <p className="mt-3 max-w-md text-center text-[12px] leading-snug text-white/90">
          바깥 어두운 영역을 클릭하거나 Esc로 닫기
        </p>
      </div>
    </div>
  );
}

/**
 * @param {{ src: string, alt: string, fileLabel: string, onOpen: (p: { src: string, alt: string }) => void }} props
 */
function GuideImageThumb({ src, alt, fileLabel, onOpen }) {
  const [broken, setBroken] = useState(false);

  return (
    <button
      type="button"
      className="group mt-3 w-full overflow-hidden rounded-lg border border-[#e9e9e7] bg-white text-left shadow-[0_1px_2px_rgba(15,15,15,0.04)] transition hover:border-[#d3d3d0] hover:shadow-[0_4px_12px_rgba(15,15,15,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2383e2] disabled:cursor-not-allowed disabled:opacity-70"
      aria-label={`${alt} — 크게 보기`}
      disabled={broken}
      onClick={() => {
        if (!broken) onOpen({ src, alt });
      }}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#f7f6f3] sm:aspect-[5/3]">
        {broken ? (
          <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-1 px-4 text-center">
            <p className="text-[12px] font-medium text-[#787774]">이미지를 불러올 수 없습니다</p>
            <p className="text-[11px] leading-snug text-[#9b9a97]">
              <span className="font-mono text-[10px] text-[#c7c7c5]">
                public/images/{fileLabel}
              </span>
              <br />
              경로·파일명이 위와 같은지 확인해 주세요.
            </p>
          </div>
        ) : (
          <img
            src={src}
            alt=""
            decoding="async"
            loading="lazy"
            className="h-full w-full object-cover object-top transition duration-200 group-hover:scale-[1.015]"
            onError={() => setBroken(true)}
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[#e9e9e7] bg-[#fbfbfa] px-3 py-2">
        <span className="text-[11px] text-[#787774]">
          {broken ? "이미지 없음" : "클릭하여 크게 보기"}
        </span>
        {!broken ? (
          <span className="text-[11px] font-medium text-[#2383e2]">확대</span>
        ) : null}
      </div>
    </button>
  );
}

/** @param {File} file */
function isAllowedDataFile(file) {
  const name = file.name.toLowerCase();
  const i = name.lastIndexOf(".");
  if (i < 0) return false;
  return ALLOWED_EXT.has(name.slice(i));
}

/**
 * @param {object} props
 * @param {string} props.label
 * @param {string} props.sub
 * @param {string} [props.hint]
 * @param {File | null} props.file
 * @param {(f: File) => void} props.onFile
 * @param {(msg: string) => void} props.onInvalidFile
 * @param {boolean} props.disabled
 * @param {string} props.tintClass
 * @param {string} props.accentClass
 */
function FileDropZone({ label, sub, hint, file, onFile, onInvalidFile, disabled, tintClass, accentClass }) {
  const [over, setOver] = useState(false);
  const rootRef = useRef(null);

  const onDragOver = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      setOver(true);
      e.dataTransfer.dropEffect = "copy";
    },
    [disabled]
  );

  const onDragLeave = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      const next = e.relatedTarget;
      if (next === null || !(rootRef.current instanceof Node) || !rootRef.current.contains(next)) {
        setOver(false);
      }
    },
    [disabled]
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setOver(false);
      if (disabled) return;
      const f = e.dataTransfer?.files?.[0];
      if (!f) return;
      if (!isAllowedDataFile(f)) {
        onInvalidFile("CSV 또는 Excel(.csv, .xlsx, .xlsm, .xls)만 놓을 수 있어요.");
        return;
      }
      onFile(f);
    },
    [disabled, onFile, onInvalidFile]
  );

  return (
    <div
      ref={rootRef}
      className={[
        "relative overflow-hidden rounded-lg border bg-white transition-[border-color,box-shadow,background-color] duration-150",
        over
          ? "border-[#2383e2] bg-[#f7fbff] shadow-[0_0_0_3px_rgba(35,131,226,0.12)]"
          : "border-[#e9e9e7] shadow-[0_1px_2px_rgba(15,15,15,0.04)]",
      ].join(" ")}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div
        className={[
          "pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center transition-opacity duration-150",
          over ? "opacity-100" : "opacity-0",
        ].join(" ")}
        aria-hidden={!over}
      >
        <span className="text-sm font-medium text-[#2383e2]">여기에 놓으세요</span>
        <span className="text-xs text-[#787774]">놓으면 이 칸에만 적용됩니다</span>
      </div>

      <div
        className={[
          "relative p-4 transition-opacity duration-150 sm:p-5",
          over ? "opacity-[0.22]" : "opacity-100",
          tintClass,
          accentClass,
        ].join(" ")}
      >
        <p className="text-[15px] font-semibold tracking-tight text-[#37352f]">{label}</p>
        <p className="mt-1 text-[13px] leading-snug text-[#787774]">{sub}</p>
        {hint ? (
          <p className="mt-2 inline-flex max-w-full rounded border border-[#e9e9e7] bg-[#f7f6f3] px-2 py-1 text-[12px] text-[#5c5b57]">
            {hint}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer">
            <span className="rounded-md border border-[#e9e9e7] bg-white px-3 py-1.5 text-[13px] font-medium text-[#37352f] shadow-sm transition hover:bg-[#f7f6f3] active:bg-[#f1f0ed]">
              파일 선택
            </span>
            <input
              type="file"
              accept={ACCEPT_ATTR}
              className="sr-only"
              disabled={disabled}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && !isAllowedDataFile(f)) {
                  onInvalidFile("CSV 또는 Excel(.csv, .xlsx, .xlsm, .xls)만 선택할 수 있어요.");
                } else if (f) {
                  onFile(f);
                }
                e.target.value = "";
              }}
            />
          </label>
          <span className="text-xs text-[#9b9a97]">또는 이 영역으로 드래그</span>
        </div>

        <div className="mt-3 rounded-md border border-[#e9e9e7] bg-[#fbfbfa] px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#9b9a97]">
            선택된 파일
          </p>
          <p className="mt-1 break-all text-[13px] text-[#37352f]">
            {file ? file.name : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

function UsageGuideModal({ open, onClose }) {
  const titleId = useId();
  const closeRef = useRef(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!open) setPreview(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (preview) setPreview(null);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      if (!preview) closeRef.current?.focus();
    }, 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose, preview]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="absolute inset-0 bg-[#0f0f0f]/25 backdrop-blur-[2px]" aria-hidden />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative max-h-[min(92vh,800px)] w-full max-w-2xl overflow-y-auto rounded-lg border border-[#e9e9e7] bg-white shadow-[0_8px_32px_rgba(15,15,15,0.12)]"
        >
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#e9e9e7] bg-white/95 px-5 py-4 backdrop-blur-sm">
            <h2 id={titleId} className="text-[17px] font-semibold tracking-tight text-[#37352f]">
              사용방법
            </h2>
            <button
              ref={closeRef}
              type="button"
              className="shrink-0 rounded-md px-2 py-1 text-[13px] font-medium text-[#787774] transition hover:bg-[#f7f6f3] hover:text-[#37352f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2383e2]"
              onClick={onClose}
            >
              닫기
            </button>
          </div>

          <div className="space-y-6 px-5 py-5 text-[13px] leading-relaxed text-[#37352f]">
            <section>
              <h3 className="text-[13px] font-semibold text-[#37352f]">[1번 칸 - 원인행위 목록]</h3>
              <ul className="mt-2 list-inside list-disc space-y-1.5 text-[#5c5b57] marker:text-[#c7c7c5]">
                <li>에듀파인 → 원인행위일자 설정</li>
                <li>결의대상(카드) 클릭 후 엑셀 다운로드</li>
              </ul>
              <GuideImageThumb
                src={GUIDE_IMG_EDU}
                alt="원인행위목록 엑셀 다운로드 안내 이미지"
                fileLabel={GUIDE_IMG_FILE_EDU}
                onOpen={setPreview}
              />
            </section>

            <section>
              <h3 className="text-[13px] font-semibold text-[#37352f]">[2번 칸 - 카드 고지서]</h3>
              <ul className="mt-2 list-inside list-disc space-y-1.5 text-[#5c5b57] marker:text-[#c7c7c5]">
                <li>BC카드 홈페이지 → 카드이용 조회</li>
                <li>청구명세서조회 → 날짜 선택 후 엑셀 다운로드</li>
              </ul>
              <GuideImageThumb
                src={GUIDE_IMG_CARD}
                alt="BC카드 청구명세서 엑셀 다운로드 안내 이미지"
                fileLabel={GUIDE_IMG_FILE_CARD}
                onOpen={setPreview}
              />
            </section>

            <div className="space-y-2 rounded-md border border-[#e9e9e7] bg-[#fbfbfa] px-3 py-3 text-[12px] text-[#5c5b57]">
              <p>※ 고지서나 원인행위목록 서식 변경하면 작동 안 함</p>
              <p>※ 결과는 반드시 교차검증 필수</p>
            </div>
          </div>
        </div>
      </div>

      <ImageLightbox
        open={!!preview}
        src={preview?.src ?? null}
        alt={preview?.alt ?? ""}
        onClose={() => setPreview(null)}
      />
    </>
  );
}

export default function CardMatch() {
  const [eduFile, setEduFile] = useState(null);
  const [cardFile, setCardFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);

  const run = async () => {
    setError("");
    if (!eduFile || !cardFile) {
      setError("원인행위 목록과 카드 고지서 파일을 모두 선택해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const [eduRows, cardRows] = await Promise.all([
        parseDataFileToRows(eduFile),
        parseDataFileToRows(cardFile),
      ]);
      const result = runAnalysisFromRows(eduRows, cardRows);
      const buf = await buildCardMatchWorkbook(result);
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = OUTPUT_FILENAME;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-[#37352f]">카드 고지서 매칭</h1>
        <button
          type="button"
          className="inline-flex w-fit shrink-0 items-center rounded-md border border-[#e9e9e7] bg-white px-3 py-1.5 text-[13px] font-medium text-[#37352f] shadow-sm transition hover:bg-[#f7f6f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2383e2]"
          onClick={() => setGuideOpen(true)}
        >
          사용방법
        </button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[#787774]">
        에듀파인 <span className="font-medium text-[#37352f]">원인행위 목록</span>과 카드사{" "}
        <span className="font-medium text-[#37352f]">청구(고지서) 내역</span>을 대조합니다. 업로드한 파일은{" "}
        <span className="font-medium text-[#37352f]">서버로 전송되지 않으며</span> 이 기기의 브라우저에서만
        처리됩니다.
      </p>

      <ul className="mt-4 list-inside list-disc text-xs text-[#9b9a97]">
        <li>원인행위: 열 이름에 일자, 제목, 원인행위금액(및 번호·품명 등)이 있어야 합니다.</li>
        <li>카드: 승인일자, 이용금액, 가맹점명/국가명 열이 필요합니다.</li>
        <li>지원 형식: CSV, .xlsx, .xlsm, .xls (첫 번째 시트를 읽습니다)</li>
      </ul>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <FileDropZone
          label="1. 원인행위 목록"
          sub="에듀파인에서 내보낸 Excel 또는 CSV"
          hint="에듀파인 원인행위목록 엑셀"
          file={eduFile}
          onFile={setEduFile}
          onInvalidFile={setError}
          disabled={busy}
          tintClass="bg-[#fbfbfa]"
          accentClass="sm:min-h-[200px]"
        />
        <FileDropZone
          label="2. 카드 고지서(청구내역)"
          sub="카드사 고지서 Excel 또는 CSV"
          hint="BC카드 청구명세서 엑셀"
          file={cardFile}
          onFile={setCardFile}
          onInvalidFile={setError}
          disabled={busy}
          tintClass="bg-[#fbfbfa]"
          accentClass="sm:min-h-[200px]"
        />
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200/80 bg-red-50/90 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className="mt-8 w-full rounded-md bg-[#2383e2] py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#1a6ec7] disabled:cursor-not-allowed disabled:opacity-60"
        onClick={run}
        disabled={busy}
      >
        {busy ? "처리 중…" : "대조 분석 후 엑셀 저장"}
      </button>

      <p className="mt-3 text-center text-xs text-[#9b9a97]">
        결과 파일명: {OUTPUT_FILENAME} (브라우저 다운로드 폴더에 저장됩니다)
      </p>

      <UsageGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </main>
  );
}
