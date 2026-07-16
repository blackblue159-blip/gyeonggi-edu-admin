import {
  ChangeEvent,
  createContext,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useContext,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  createResizeSnapTargets,
  resolveResizeSnap,
} from "../lib/printForms/resize-snap.js";
import {
  repairKnownReversedText,
  repairReversedText,
} from "../lib/printForms/text-repair.js";
import "./PrintForms.css";

type SharedLabelText = {
  institutionName: string;
  institutionCaption: string;
  documentTitle: string;
  productionYearCaption: string;
  retentionPeriod: string;
  retentionPeriodCaption: string;
};

type LabelEntry = SharedLabelText & {
  id: string;
  productionYear: string;
  schoolYear: string;
  monthText: string;
  volumeText: string;
  periodText: string;
};

type TemplateId = "expense" | "file-folder" | "ledger-cover";
type FileFolderPrintScope = "all" | "labels" | "cover";

type FileFolderEntry = {
  id: string;
  managementCaption: string;
  managementNumber: string;
  productionYearCaption: string;
  productionYear: string;
  classificationCaption: string;
  classificationNumber: string;
  titleCaption: string;
  documentTitle: string;
  institutionCaption: string;
  institutionName: string;
};

type FileFolderSettings = {
  labelsPerPage: number;
  labelWidthsMm: number[];
  labelGapMm: number;
  labelHeightMm: number;
  topBlockHeightMm: number;
  footerBlockHeightMm: number;
  titleFontSizePt: number;
  bodyFontSizePt: number;
  institutionFontSizePt: number;
  captionCellColor: string;
  valueCellColor: string;
  titleAreaColor: string;
  institutionAreaColor: string;
  coverBoxColor: string;
  coverTitle: string;
  coverYear: string;
  coverInstitutionName: string;
  coverTitleFontSizePt: number;
  coverYearFontSizePt: number;
  coverInstitutionFontSizePt: number;
  coverTitleWidthMm: number;
  coverTitleHeightMm: number;
  coverYearWidthMm: number;
  coverYearHeightMm: number;
  coverInstitutionWidthMm: number;
  coverInstitutionHeightMm: number;
  entries: FileFolderEntry[];
};

type LedgerCoverSettings = {
  academicYear: string;
  periodText: string;
  title: string;
  volumeText: string;
  agencyCaption: string;
  institutionName: string;
  infoFontSizePt: number;
  titleFontSizePt: number;
  footerFontSizePt: number;
  frameWidthMm: number;
  frameHeightMm: number;
  infoWidthMm: number;
  infoHeightMm: number;
  titleWidthMm: number;
  titleHeightMm: number;
  footerWidthMm: number;
  footerHeightMm: number;
  pageColor: string;
  infoAreaColor: string;
  titleAreaColor: string;
  footerAreaColor: string;
};

type SchoolPrintSettings = SharedLabelText & {
  labelsPerPage: number;
  labelWidthsMm: number[];
  labelGapMm: number;
  labelHeightMm: number;
  titleFontSizePt: number;
  bodyFontSizePt: number;
  topBlockHeightMm: number;
  footerBlockHeightMm: number;
  headerCellColor: string;
  periodCellColor: string;
  titleAreaColor: string;
  footerCellColor: string;
  fontSizeOverridesPt: Record<string, number>;
  entries: LabelEntry[];
  fileFolder: FileFolderSettings;
  ledgerCover: LedgerCoverSettings;
};

type ExpenseColorField =
  | "headerCellColor"
  | "periodCellColor"
  | "titleAreaColor"
  | "footerCellColor";

type FileFolderColorField =
  | "captionCellColor"
  | "valueCellColor"
  | "titleAreaColor"
  | "institutionAreaColor"
  | "coverBoxColor";

type LedgerCoverColorField =
  | "pageColor"
  | "infoAreaColor"
  | "titleAreaColor"
  | "footerAreaColor";

type ColorTarget =
  | { template: "expense"; field: ExpenseColorField }
  | { template: "file-folder"; field: FileFolderColorField }
  | { template: "ledger-cover"; field: LedgerCoverColorField };

type TextFontTarget = {
  baseSizePt: number;
  key: string;
  label: string;
};

type TextFontEditingContextValue = {
  activate: (target: TextFontTarget) => void;
  overrides: Record<string, number>;
  template: TemplateId;
};

const TextFontEditingContext = createContext<TextFontEditingContextValue | null>(
  null,
);

type SettingsUpdater =
  | SchoolPrintSettings
  | ((current: SchoolPrintSettings) => SchoolPrintSettings);

type SettingsHistory = {
  activeGroup: string | null;
  future: SchoolPrintSettings[];
  past: SchoolPrintSettings[];
  present: SchoolPrintSettings;
};

type SettingsHistoryAction =
  | { type: "apply"; group: string | null; update: SettingsUpdater }
  | { type: "end-group" }
  | { type: "redo" }
  | { type: "replace"; settings: SchoolPrintSettings }
  | { type: "undo" };

type ResizeKind =
  | "width"
  | "height"
  | "top"
  | "footer"
  | "folder-width"
  | "folder-height"
  | "folder-top"
  | "folder-footer"
  | "cover-title-width"
  | "cover-title-height"
  | "cover-year-width"
  | "cover-year-height"
  | "cover-institution-width"
  | "cover-institution-height"
  | "ledger-frame-width"
  | "ledger-frame-height"
  | "ledger-info-width"
  | "ledger-info-height"
  | "ledger-title-width"
  | "ledger-title-height"
  | "ledger-footer-width"
  | "ledger-footer-height";

type LedgerResizeKind = Extract<
  ResizeKind,
  | "ledger-frame-width"
  | "ledger-frame-height"
  | "ledger-info-width"
  | "ledger-info-height"
  | "ledger-title-width"
  | "ledger-title-height"
  | "ledger-footer-width"
  | "ledger-footer-height"
>;

type ResizeSession = {
  historyGroup: string;
  axis: "x" | "y";
  direction: 1 | -1;
  kind: ResizeKind;
  handle: HTMLButtonElement;
  lockedSnapTarget: number | null;
  pointerId: number;
  snapTargets: number[];
  slotIndex: number;
  startClientX: number;
  startClientY: number;
  startValue: number;
  mmPerPixelX: number;
  mmPerPixelY: number;
  minimum: number;
  maximum: number;
};

type ResizeFeedback = {
  kind: ResizeKind;
  slotIndex: number;
  snapped: boolean;
  value: number;
};

const STORAGE_KEY = "school-print-settings-v1";
const MAX_LABELS_PER_PAGE = 8;
const MAX_FILE_FOLDER_LABELS_PER_PAGE = 12;
const HISTORY_LIMIT = 50;
const TEXT_FONT_MIN_PT = 6;
const TEXT_FONT_MAX_PT = 72;
const TEXT_FONT_STEP_PT = 0.5;
const YEAR_PATTERN = /^20\d{2}$/;
const SCHOOL_YEAR_PATTERN = /^20\d{2}(?:학년도)?$/;
const MONTH_PATTERN = /^20\d{2}년\s*\d{1,2}월$/;
const PERIOD_PATTERN = /^\(\d{1,2}\.\d{1,2}\.~\d{1,2}\.\d{1,2}\.\)$/;
const RETENTION_PERIOD_PATTERN = /^\d+년$/;
const INSTITUTION_PATTERN = /^\S+(?:학교|유치원|교육청|지원청)$/;

const defaultSharedLabelText: SharedLabelText = {
  institutionName: "OOO학교",
  institutionCaption: "기관명",
  documentTitle: "지출증빙서",
  productionYearCaption: "생산년도",
  retentionPeriod: "5년",
  retentionPeriodCaption: "보존기간",
};

const defaultEntries: LabelEntry[] = [
  {
    ...defaultSharedLabelText,
    id: "label-1",
    productionYear: "2022",
    schoolYear: "2026학년도",
    monthText: "2026년 3월",
    volumeText: "5-1",
    periodText: "(3.1.~3.15.)",
  },
  {
    ...defaultSharedLabelText,
    id: "label-2",
    productionYear: "2022",
    schoolYear: "2026학년도",
    monthText: "2026년 3월",
    volumeText: "5-2",
    periodText: "(3.1.~3.15.)",
  },
  {
    ...defaultSharedLabelText,
    id: "label-3",
    productionYear: "2022",
    schoolYear: "2026학년도",
    monthText: "2026년 3월",
    volumeText: "5-3",
    periodText: "(3.1.~3.15.)",
  },
  {
    ...defaultSharedLabelText,
    id: "label-4",
    productionYear: "2022",
    schoolYear: "2026학년도",
    monthText: "2026년 3월",
    volumeText: "5-4",
    periodText: "(3.1.~3.15.)",
  },
  {
    ...defaultSharedLabelText,
    id: "label-5",
    productionYear: "2022",
    schoolYear: "2026학년도",
    monthText: "2026년 3월",
    volumeText: "5-5",
    periodText: "(3.1.~3.15.)",
  },
];

const defaultFileFolderEntries: FileFolderEntry[] = [
  ["2026", "교육공무직원 대체직 채용서류"],
  ["2026", "교육공무직원 전자신분증 발급"],
  ["2026", "특수운영직군(시설당직원) 인사 서류"],
  ["2026", "특수운영직군(시설미화원) 인사 서류"],
  ["2026", "특수운영직군 업무 자료"],
  ["2026", "기록물 관리 업무"],
  ["2026", "민원응대 친절교육"],
  ["2026", "연말정산 업무 자료"],
  ["2026", "팩스 민원 문서"],
  ["2026", "개인정보 수집 및 이용 동의서"],
].map(([productionYear, documentTitle], index) => ({
  id: `folder-label-${index + 1}`,
  managementCaption: "관리번호",
  managementNumber: "",
  productionYearCaption: "생산연도",
  productionYear,
  classificationCaption: "분류번호",
  classificationNumber: "",
  titleCaption: "제목",
  documentTitle,
  institutionCaption: "기관명",
  institutionName: "OOO학교",
}));

const defaultFileFolderSettings: FileFolderSettings = {
  labelsPerPage: 10,
  labelWidthsMm: Array(10).fill(15),
  labelGapMm: 3,
  labelHeightMm: 243,
  topBlockHeightMm: 64,
  footerBlockHeightMm: 60,
  titleFontSizePt: 23,
  bodyFontSizePt: 9,
  institutionFontSizePt: 19,
  captionCellColor: "#ffffff",
  valueCellColor: "#ffffff",
  titleAreaColor: "#ffffff",
  institutionAreaColor: "#ffffff",
  coverBoxColor: "#ffffff",
  coverTitle: "교육공무직원 인사위원회 구성",
  coverYear: "2026",
  coverInstitutionName: "OOO학교",
  coverTitleFontSizePt: 26,
  coverYearFontSizePt: 32,
  coverInstitutionFontSizePt: 24,
  coverTitleWidthMm: 160,
  coverTitleHeightMm: 41,
  coverYearWidthMm: 66,
  coverYearHeightMm: 21,
  coverInstitutionWidthMm: 81,
  coverInstitutionHeightMm: 31,
  entries: defaultFileFolderEntries,
};

const defaultLedgerCoverSettings: LedgerCoverSettings = {
  academicYear: "2026학년도",
  periodText: "2026. 03. 01. ~ 2027. 02. 28.",
  title: "2026년 급여대장",
  volumeText: "전 1책중 1책",
  agencyCaption: "관서명",
  institutionName: "OOO학교",
  infoFontSizePt: 18,
  titleFontSizePt: 30,
  footerFontSizePt: 16,
  frameWidthMm: 195.8,
  frameHeightMm: 217.3,
  infoWidthMm: 86,
  infoHeightMm: 20,
  titleWidthMm: 143.6,
  titleHeightMm: 38.8,
  footerWidthMm: 95.2,
  footerHeightMm: 22.4,
  pageColor: "#ffffff",
  infoAreaColor: "#ffffff",
  titleAreaColor: "#ffffff",
  footerAreaColor: "#ffffff",
};

const defaultSettings: SchoolPrintSettings = {
  ...defaultSharedLabelText,
  labelsPerPage: 5,
  labelWidthsMm: [52, 52, 52, 52, 52],
  labelGapMm: 3,
  labelHeightMm: 190,
  titleFontSizePt: 30,
  bodyFontSizePt: 10,
  topBlockHeightMm: 37,
  footerBlockHeightMm: 42,
  headerCellColor: "#ead7e1",
  periodCellColor: "#ffffff",
  titleAreaColor: "#ffffff",
  footerCellColor: "#ffffff",
  fontSizeOverridesPt: {},
  entries: defaultEntries,
  fileFolder: defaultFileFolderSettings,
  ledgerCover: defaultLedgerCoverSettings,
};

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function normalizeColor(value: unknown, fallback: string) {
  const color = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
}

function normalizeFontSizeOverrides(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(
        ([key, fontSize]) =>
          key.length <= 160 &&
          ["expense:", "file-folder:", "ledger-cover:"].some((prefix) =>
            key.startsWith(prefix),
          ) &&
          Number.isFinite(Number(fontSize)),
      )
      .map(([key, fontSize]) => [
        key,
        clampNumber(Number(fontSize), TEXT_FONT_MIN_PT, TEXT_FONT_MAX_PT),
      ]),
  );
}

function clearTemplateFontSizeOverrides(
  overrides: Record<string, number>,
  template: TemplateId,
) {
  const prefix = `${template}:`;
  return Object.fromEntries(
    Object.entries(overrides).filter(([key]) => !key.startsWith(prefix)),
  );
}

function normalizeWidths(widths: unknown, count: number) {
  const source = Array.isArray(widths) ? widths : [];
  return Array.from({ length: count }, (_, index) => {
    const value = Number(source[index] ?? defaultSettings.labelWidthsMm[index] ?? 44);
    return clampNumber(value, 20, 80);
  });
}

function normalizeFileFolderWidths(widths: unknown, count: number) {
  const source = Array.isArray(widths) ? widths : [];
  return Array.from({ length: count }, (_, index) => {
    const value = Number(
      source[index] ?? defaultFileFolderSettings.labelWidthsMm[index] ?? 15,
    );
    return clampNumber(value, 10, 30);
  });
}

function normalizeFileFolderEntries(entries: unknown): FileFolderEntry[] {
  if (!Array.isArray(entries) || entries.length === 0) {
    return defaultFileFolderEntries.map((entry) => ({ ...entry }));
  }

  return entries.map((entry, index) => {
    const fallback =
      defaultFileFolderEntries[index] ?? defaultFileFolderEntries[0];
    const item = entry as Partial<FileFolderEntry>;
    return {
      id:
        typeof item.id === "string"
          ? item.id
          : `folder-label-imported-${index + 1}`,
      managementCaption: String(
        item.managementCaption ?? fallback.managementCaption,
      ),
      managementNumber: String(item.managementNumber ?? ""),
      productionYearCaption: String(
        item.productionYearCaption ?? fallback.productionYearCaption,
      ),
      productionYear: String(item.productionYear ?? fallback.productionYear),
      classificationCaption: String(
        item.classificationCaption ?? fallback.classificationCaption,
      ),
      classificationNumber: String(item.classificationNumber ?? ""),
      titleCaption: String(item.titleCaption ?? fallback.titleCaption),
      documentTitle: String(item.documentTitle ?? fallback.documentTitle),
      institutionCaption: String(
        item.institutionCaption ?? fallback.institutionCaption,
      ),
      institutionName: String(
        item.institutionName ?? fallback.institutionName,
      ),
    };
  });
}

function normalizeFileFolderSettings(value: unknown): FileFolderSettings {
  const data = (value ?? {}) as Partial<FileFolderSettings>;
  const labelsPerPage = clampNumber(
    Number(data.labelsPerPage ?? defaultFileFolderSettings.labelsPerPage),
    1,
    MAX_FILE_FOLDER_LABELS_PER_PAGE,
  );

  return {
    labelsPerPage,
    labelWidthsMm: normalizeFileFolderWidths(
      data.labelWidthsMm,
      labelsPerPage,
    ),
    labelGapMm: clampNumber(
      Number(data.labelGapMm ?? defaultFileFolderSettings.labelGapMm),
      0,
      8,
    ),
    labelHeightMm: clampNumber(
      Number(data.labelHeightMm ?? defaultFileFolderSettings.labelHeightMm),
      180,
      265,
    ),
    topBlockHeightMm: clampNumber(
      Number(
        data.topBlockHeightMm ?? defaultFileFolderSettings.topBlockHeightMm,
      ),
      45,
      90,
    ),
    footerBlockHeightMm: clampNumber(
      Number(
        data.footerBlockHeightMm ??
          defaultFileFolderSettings.footerBlockHeightMm,
      ),
      35,
      80,
    ),
    titleFontSizePt: clampNumber(
      Number(
        data.titleFontSizePt ?? defaultFileFolderSettings.titleFontSizePt,
      ),
      10,
      34,
    ),
    bodyFontSizePt: clampNumber(
      Number(data.bodyFontSizePt ?? defaultFileFolderSettings.bodyFontSizePt),
      7,
      14,
    ),
    institutionFontSizePt: clampNumber(
      Number(
        data.institutionFontSizePt ??
          defaultFileFolderSettings.institutionFontSizePt,
      ),
      10,
      28,
    ),
    captionCellColor: normalizeColor(
      data.captionCellColor,
      defaultFileFolderSettings.captionCellColor,
    ),
    valueCellColor: normalizeColor(
      data.valueCellColor,
      defaultFileFolderSettings.valueCellColor,
    ),
    titleAreaColor: normalizeColor(
      data.titleAreaColor,
      defaultFileFolderSettings.titleAreaColor,
    ),
    institutionAreaColor: normalizeColor(
      data.institutionAreaColor,
      defaultFileFolderSettings.institutionAreaColor,
    ),
    coverBoxColor: normalizeColor(
      data.coverBoxColor,
      defaultFileFolderSettings.coverBoxColor,
    ),
    coverTitle: String(
      data.coverTitle ?? defaultFileFolderSettings.coverTitle,
    ),
    coverYear: String(data.coverYear ?? defaultFileFolderSettings.coverYear),
    coverInstitutionName: String(
      data.coverInstitutionName ??
        defaultFileFolderSettings.coverInstitutionName,
    ),
    coverTitleFontSizePt: clampNumber(
      Number(
        data.coverTitleFontSizePt ??
          defaultFileFolderSettings.coverTitleFontSizePt,
      ),
      14,
      40,
    ),
    coverYearFontSizePt: clampNumber(
      Number(
        data.coverYearFontSizePt ??
          defaultFileFolderSettings.coverYearFontSizePt,
      ),
      16,
      44,
    ),
    coverInstitutionFontSizePt: clampNumber(
      Number(
        data.coverInstitutionFontSizePt ??
          defaultFileFolderSettings.coverInstitutionFontSizePt,
      ),
      14,
      38,
    ),
    coverTitleWidthMm: clampNumber(
      Number(
        data.coverTitleWidthMm ??
          defaultFileFolderSettings.coverTitleWidthMm,
      ),
      80,
      180,
    ),
    coverTitleHeightMm: clampNumber(
      Number(
        data.coverTitleHeightMm ??
          defaultFileFolderSettings.coverTitleHeightMm,
      ),
      20,
      65,
    ),
    coverYearWidthMm: clampNumber(
      Number(
        data.coverYearWidthMm ?? defaultFileFolderSettings.coverYearWidthMm,
      ),
      40,
      150,
    ),
    coverYearHeightMm: clampNumber(
      Number(
        data.coverYearHeightMm ?? defaultFileFolderSettings.coverYearHeightMm,
      ),
      15,
      50,
    ),
    coverInstitutionWidthMm: clampNumber(
      Number(
        data.coverInstitutionWidthMm ??
          defaultFileFolderSettings.coverInstitutionWidthMm,
      ),
      50,
      160,
    ),
    coverInstitutionHeightMm: clampNumber(
      Number(
        data.coverInstitutionHeightMm ??
          defaultFileFolderSettings.coverInstitutionHeightMm,
      ),
      20,
      55,
    ),
    entries: normalizeFileFolderEntries(data.entries),
  };
}

function normalizeLedgerCoverSettings(value: unknown): LedgerCoverSettings {
  const data = (value ?? {}) as Partial<LedgerCoverSettings>;

  return {
    academicYear: String(
      data.academicYear ?? defaultLedgerCoverSettings.academicYear,
    ),
    periodText: String(data.periodText ?? defaultLedgerCoverSettings.periodText),
    title: String(data.title ?? defaultLedgerCoverSettings.title),
    volumeText: String(data.volumeText ?? defaultLedgerCoverSettings.volumeText),
    agencyCaption: String(
      data.agencyCaption ?? defaultLedgerCoverSettings.agencyCaption,
    ),
    institutionName: String(
      data.institutionName ?? defaultLedgerCoverSettings.institutionName,
    ),
    infoFontSizePt: clampNumber(
      Number(data.infoFontSizePt ?? defaultLedgerCoverSettings.infoFontSizePt),
      10,
      28,
    ),
    titleFontSizePt: clampNumber(
      Number(data.titleFontSizePt ?? defaultLedgerCoverSettings.titleFontSizePt),
      18,
      44,
    ),
    footerFontSizePt: clampNumber(
      Number(
        data.footerFontSizePt ?? defaultLedgerCoverSettings.footerFontSizePt,
      ),
      10,
      26,
    ),
    frameWidthMm: clampNumber(
      Number(data.frameWidthMm ?? defaultLedgerCoverSettings.frameWidthMm),
      150,
      200,
    ),
    frameHeightMm: clampNumber(
      Number(data.frameHeightMm ?? defaultLedgerCoverSettings.frameHeightMm),
      180,
      245,
    ),
    infoWidthMm: clampNumber(
      Number(data.infoWidthMm ?? defaultLedgerCoverSettings.infoWidthMm),
      55,
      150,
    ),
    infoHeightMm: clampNumber(
      Number(data.infoHeightMm ?? defaultLedgerCoverSettings.infoHeightMm),
      14,
      40,
    ),
    titleWidthMm: clampNumber(
      Number(data.titleWidthMm ?? defaultLedgerCoverSettings.titleWidthMm),
      80,
      185,
    ),
    titleHeightMm: clampNumber(
      Number(data.titleHeightMm ?? defaultLedgerCoverSettings.titleHeightMm),
      20,
      70,
    ),
    footerWidthMm: clampNumber(
      Number(data.footerWidthMm ?? defaultLedgerCoverSettings.footerWidthMm),
      60,
      160,
    ),
    footerHeightMm: clampNumber(
      Number(data.footerHeightMm ?? defaultLedgerCoverSettings.footerHeightMm),
      16,
      45,
    ),
    pageColor: normalizeColor(
      data.pageColor,
      defaultLedgerCoverSettings.pageColor,
    ),
    infoAreaColor: normalizeColor(
      data.infoAreaColor,
      defaultLedgerCoverSettings.infoAreaColor,
    ),
    titleAreaColor: normalizeColor(
      data.titleAreaColor,
      defaultLedgerCoverSettings.titleAreaColor,
    ),
    footerAreaColor: normalizeColor(
      data.footerAreaColor,
      defaultLedgerCoverSettings.footerAreaColor,
    ),
  };
}

function normalizeEntries(
  entries: unknown,
  sharedFallback: SharedLabelText,
): LabelEntry[] {
  if (!Array.isArray(entries) || entries.length === 0) return defaultEntries;

  return entries.map((entry, index) => {
    const item = entry as Partial<LabelEntry>;
    return {
      id: typeof item.id === "string" ? item.id : `label-imported-${index + 1}`,
      productionYear: repairReversedText(
        String(item.productionYear ?? ""),
        YEAR_PATTERN,
      ),
      schoolYear: repairReversedText(
        String(item.schoolYear ?? ""),
        SCHOOL_YEAR_PATTERN,
      ),
      monthText: repairReversedText(
        String(item.monthText ?? ""),
        MONTH_PATTERN,
      ),
      volumeText: String(item.volumeText ?? ""),
      periodText: repairReversedText(
        String(item.periodText ?? ""),
        PERIOD_PATTERN,
      ),
      institutionName: repairReversedText(
        String(item.institutionName ?? sharedFallback.institutionName),
        INSTITUTION_PATTERN,
      ),
      institutionCaption: repairKnownReversedText(
        String(item.institutionCaption ?? sharedFallback.institutionCaption),
      ),
      documentTitle: repairKnownReversedText(
        String(item.documentTitle ?? sharedFallback.documentTitle),
      ),
      productionYearCaption: repairKnownReversedText(
        String(
          item.productionYearCaption ?? sharedFallback.productionYearCaption,
        ),
      ),
      retentionPeriod: repairReversedText(
        String(item.retentionPeriod ?? sharedFallback.retentionPeriod),
        RETENTION_PERIOD_PATTERN,
      ),
      retentionPeriodCaption: repairKnownReversedText(
        String(
          item.retentionPeriodCaption ?? sharedFallback.retentionPeriodCaption,
        ),
      ),
    };
  });
}

function normalizeSettings(value: unknown): SchoolPrintSettings {
  const data = value as Partial<SchoolPrintSettings>;
  const labelsPerPage = clampNumber(Number(data.labelsPerPage ?? 5), 1, MAX_LABELS_PER_PAGE);
  const sharedText: SharedLabelText = {
    institutionName: repairReversedText(
      String(data.institutionName ?? defaultSettings.institutionName),
      INSTITUTION_PATTERN,
    ),
    institutionCaption: repairKnownReversedText(
      String(data.institutionCaption ?? defaultSettings.institutionCaption),
    ),
    documentTitle: repairKnownReversedText(
      String(data.documentTitle ?? defaultSettings.documentTitle),
    ),
    productionYearCaption: repairKnownReversedText(
      String(
        data.productionYearCaption ?? defaultSettings.productionYearCaption,
      ),
    ),
    retentionPeriod: repairReversedText(
      String(data.retentionPeriod ?? defaultSettings.retentionPeriod),
      RETENTION_PERIOD_PATTERN,
    ),
    retentionPeriodCaption: repairKnownReversedText(
      String(
        data.retentionPeriodCaption ?? defaultSettings.retentionPeriodCaption,
      ),
    ),
  };

  return {
    ...sharedText,
    labelsPerPage,
    labelWidthsMm: normalizeWidths(data.labelWidthsMm, labelsPerPage),
    labelGapMm: clampNumber(
      Number(data.labelGapMm ?? defaultSettings.labelGapMm),
      0,
      8,
    ),
    labelHeightMm: clampNumber(Number(data.labelHeightMm ?? 190), 140, 200),
    titleFontSizePt: clampNumber(Number(data.titleFontSizePt ?? 30), 18, 46),
    bodyFontSizePt: clampNumber(Number(data.bodyFontSizePt ?? 10), 8, 15),
    topBlockHeightMm: clampNumber(Number(data.topBlockHeightMm ?? 37), 24, 56),
    footerBlockHeightMm: clampNumber(Number(data.footerBlockHeightMm ?? 42), 28, 62),
    headerCellColor: normalizeColor(
      data.headerCellColor,
      defaultSettings.headerCellColor,
    ),
    periodCellColor: normalizeColor(
      data.periodCellColor,
      defaultSettings.periodCellColor,
    ),
    titleAreaColor: normalizeColor(
      data.titleAreaColor,
      defaultSettings.titleAreaColor,
    ),
    footerCellColor: normalizeColor(
      data.footerCellColor,
      defaultSettings.footerCellColor,
    ),
    fontSizeOverridesPt: normalizeFontSizeOverrides(data.fontSizeOverridesPt),
    entries: normalizeEntries(data.entries, sharedText),
    fileFolder: normalizeFileFolderSettings(data.fileFolder),
    ledgerCover: normalizeLedgerCoverSettings(data.ledgerCover),
  };
}

function chunkEntries<T>(entries: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < entries.length; index += size) {
    chunks.push(entries.slice(index, index + size));
  }
  return chunks;
}

function cloneDefaultFileFolderSettings(): FileFolderSettings {
  return {
    ...defaultFileFolderSettings,
    labelWidthsMm: [...defaultFileFolderSettings.labelWidthsMm],
    entries: defaultFileFolderEntries.map((entry) => ({ ...entry })),
  };
}

function cloneDefaultLedgerCoverSettings(): LedgerCoverSettings {
  return { ...defaultLedgerCoverSettings };
}

function createSettingsHistory(settings: SchoolPrintSettings): SettingsHistory {
  return {
    activeGroup: null,
    future: [],
    past: [],
    present: settings,
  };
}

function settingsHistoryReducer(
  state: SettingsHistory,
  action: SettingsHistoryAction,
): SettingsHistory {
  if (action.type === "replace") return createSettingsHistory(action.settings);

  if (action.type === "end-group") {
    return state.activeGroup === null ? state : { ...state, activeGroup: null };
  }

  if (action.type === "undo") {
    const previous = state.past.at(-1);
    if (!previous) return state;

    return {
      activeGroup: null,
      future: [state.present, ...state.future].slice(0, HISTORY_LIMIT),
      past: state.past.slice(0, -1),
      present: previous,
    };
  }

  if (action.type === "redo") {
    const [next, ...remainingFuture] = state.future;
    if (!next) return state;

    return {
      activeGroup: null,
      future: remainingFuture,
      past: [...state.past, state.present].slice(-HISTORY_LIMIT),
      present: next,
    };
  }

  const next =
    typeof action.update === "function"
      ? action.update(state.present)
      : action.update;
  if (next === state.present) return state;

  const continuesGroup =
    action.group !== null && action.group === state.activeGroup;

  return {
    activeGroup: action.group,
    future: [],
    past: continuesGroup
      ? state.past
      : [...state.past, state.present].slice(-HISTORY_LIMIT),
    present: next,
  };
}

export default function PrintForms() {
  const [settingsHistory, dispatchSettingsHistory] = useReducer(
    settingsHistoryReducer,
    defaultSettings,
    createSettingsHistory,
  );
  const settings = settingsHistory.present;
  const [activeTemplate, setActiveTemplate] = useState<TemplateId>("expense");
  const [fileFolderPrintScope, setFileFolderPrintScope] =
    useState<FileFolderPrintScope>("all");
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("서버 저장 없이 이 브라우저에만 보관됩니다.");
  const colorInputRef = useRef<HTMLInputElement>(null);
  const colorTargetRef = useRef<ColorTarget | null>(null);
  const [colorMode, setColorMode] = useState(false);
  const [activeTextFontTarget, setActiveTextFontTarget] =
    useState<TextFontTarget | null>(null);
  const [selectedFileFolderEntryId, setSelectedFileFolderEntryId] = useState<
    string | null
  >(defaultFileFolderEntries[0]?.id ?? null);
  const historyGroupSequenceRef = useRef(0);
  const resizeSessionRef = useRef<ResizeSession | null>(null);
  const [activeResize, setActiveResize] = useState<ResizeKind | null>(null);
  const [resizeFeedback, setResizeFeedback] = useState<ResizeFeedback | null>(null);
  const canUndo = settingsHistory.past.length > 0;
  const canRedo = settingsHistory.future.length > 0;

  function setSettings(update: SettingsUpdater, group: string | null = null) {
    dispatchSettingsHistory({ type: "apply", group, update });
  }

  function endHistoryGroup() {
    dispatchSettingsHistory({ type: "end-group" });
  }

  function undoSettings() {
    if (!canUndo) return;
    dispatchSettingsHistory({ type: "undo" });
    setNotice("이전 작업을 되돌렸습니다.");
  }

  function redoSettings() {
    if (!canRedo) return;
    dispatchSettingsHistory({ type: "redo" });
    setNotice("되돌린 작업을 다시 실행했습니다.");
  }

  /* eslint-disable react-hooks/set-state-in-effect -- browser storage hydrates after mount */
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "출력물 서식 편집기 | 경기교행 업무도우미";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        dispatchSettingsHistory({
          type: "replace",
          settings: normalizeSettings(JSON.parse(stored)),
        });
        setNotice("저장된 개인 설정을 불러왔습니다.");
      } catch {
        setNotice("저장된 설정을 읽지 못해 기본값으로 시작합니다.");
      }
    }
    setLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [loaded, settings]);

  useEffect(() => {
    function handleHistoryShortcut(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;

      const key = event.key.toLowerCase();
      const wantsUndo = key === "z" && !event.shiftKey;
      const wantsRedo = key === "y" || (key === "z" && event.shiftKey);
      if (!wantsUndo && !wantsRedo) return;

      const target = event.target;
      const usesNativeTextUndo =
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement &&
          !["button", "checkbox", "color", "file", "radio", "range"].includes(
            target.type,
          )) ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (usesNativeTextUndo) return;

      if ((wantsUndo && !canUndo) || (wantsRedo && !canRedo)) return;

      event.preventDefault();
      if (wantsRedo) {
        dispatchSettingsHistory({ type: "redo" });
        setNotice("되돌린 작업을 다시 실행했습니다.");
      } else {
        dispatchSettingsHistory({ type: "undo" });
        setNotice("이전 작업을 되돌렸습니다.");
      }
    }

    window.addEventListener("keydown", handleHistoryShortcut);
    return () => window.removeEventListener("keydown", handleHistoryShortcut);
  }, [canRedo, canUndo]);

  useEffect(() => {
    function finishResize(event?: PointerEvent) {
      const session = resizeSessionRef.current;
      if (event && session && event.pointerId !== session.pointerId) return;

      if (session?.handle.hasPointerCapture(session.pointerId)) {
        session.handle.releasePointerCapture(session.pointerId);
      }
      resizeSessionRef.current = null;
      if (session) endHistoryGroup();
      setActiveResize(null);
      setResizeFeedback(null);
      document.body.classList.remove("resizing-column", "resizing-row");
    }

    function handlePointerMove(event: PointerEvent) {
      const session = resizeSessionRef.current;
      if (!session) return;
      if (event.pointerId !== session.pointerId) return;

      event.preventDefault();
      const deltaX = (event.clientX - session.startClientX) * session.mmPerPixelX;
      const deltaY = (event.clientY - session.startClientY) * session.mmPerPixelY;

      const delta = session.axis === "x" ? deltaX : deltaY;
      const rawValue = session.startValue + delta * session.direction;
      const snap = resolveResizeSnap(
        rawValue,
        session.snapTargets,
        session.lockedSnapTarget,
      );
      session.lockedSnapTarget = snap.lockedTarget;

      const nextValue = clampNumber(
        snap.value,
        session.minimum,
        session.maximum,
      );

      setResizeFeedback({
        kind: session.kind,
        slotIndex: session.slotIndex,
        snapped: snap.snapped,
        value: nextValue,
      });

      setSettings(
        (current) => {
          if (session.kind === "width") {
            const nextWidths = normalizeWidths(
              current.labelWidthsMm,
              current.labelsPerPage,
            );
            nextWidths[session.slotIndex] = nextValue;
            return { ...current, labelWidthsMm: nextWidths };
          }

          if (session.kind === "height") {
            return { ...current, labelHeightMm: nextValue };
          }

          if (session.kind === "top") {
            return { ...current, topBlockHeightMm: nextValue };
          }

          if (session.kind === "footer") {
            return { ...current, footerBlockHeightMm: nextValue };
          }

          if (session.kind === "folder-width") {
            const nextWidths = normalizeFileFolderWidths(
              current.fileFolder.labelWidthsMm,
              current.fileFolder.labelsPerPage,
            );
            nextWidths[session.slotIndex] = nextValue;
            return {
              ...current,
              fileFolder: {
                ...current.fileFolder,
                labelWidthsMm: nextWidths,
              },
            };
          }

          if (session.kind === "folder-height") {
            return {
              ...current,
              fileFolder: {
                ...current.fileFolder,
                labelHeightMm: nextValue,
              },
            };
          }

          if (session.kind === "folder-top") {
            return {
              ...current,
              fileFolder: {
                ...current.fileFolder,
                topBlockHeightMm: nextValue,
              },
            };
          }

          if (session.kind === "folder-footer") {
            return {
              ...current,
              fileFolder: {
                ...current.fileFolder,
                footerBlockHeightMm: nextValue,
              },
            };
          }

          const ledgerField: Partial<
            Record<
              ResizeKind,
              | "frameWidthMm"
              | "frameHeightMm"
              | "infoWidthMm"
              | "infoHeightMm"
              | "titleWidthMm"
              | "titleHeightMm"
              | "footerWidthMm"
              | "footerHeightMm"
            >
          > = {
            "ledger-frame-width": "frameWidthMm",
            "ledger-frame-height": "frameHeightMm",
            "ledger-info-width": "infoWidthMm",
            "ledger-info-height": "infoHeightMm",
            "ledger-title-width": "titleWidthMm",
            "ledger-title-height": "titleHeightMm",
            "ledger-footer-width": "footerWidthMm",
            "ledger-footer-height": "footerHeightMm",
          };
          const ledgerResizeField = ledgerField[session.kind];
          if (ledgerResizeField) {
            return {
              ...current,
              ledgerCover: {
                ...current.ledgerCover,
                [ledgerResizeField]: nextValue,
              },
            };
          }

          const coverField: Partial<Record<ResizeKind, keyof FileFolderSettings>> = {
            "cover-title-width": "coverTitleWidthMm",
            "cover-title-height": "coverTitleHeightMm",
            "cover-year-width": "coverYearWidthMm",
            "cover-year-height": "coverYearHeightMm",
            "cover-institution-width": "coverInstitutionWidthMm",
            "cover-institution-height": "coverInstitutionHeightMm",
          };
          const field = coverField[session.kind];
          if (!field) return current;

          return {
            ...current,
            fileFolder: { ...current.fileFolder, [field]: nextValue },
          };
        },
        session.historyGroup,
      );
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", finishResize);
    window.addEventListener("pointercancel", finishResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishResize);
      window.removeEventListener("pointercancel", finishResize);
      document.body.classList.remove("resizing-column", "resizing-row");
    };
  }, []);

  const pages = useMemo(
    () => chunkEntries(settings.entries, settings.labelsPerPage),
    [settings.entries, settings.labelsPerPage],
  );

  const fileFolderPages = useMemo(
    () =>
      chunkEntries(
        settings.fileFolder.entries,
        settings.fileFolder.labelsPerPage,
      ),
    [settings.fileFolder.entries, settings.fileFolder.labelsPerPage],
  );
  const showFileFolderLabels = fileFolderPrintScope !== "cover";
  const showFileFolderCover = fileFolderPrintScope !== "labels";
  const fileFolderVisiblePageCount =
    (showFileFolderLabels ? fileFolderPages.length : 0) +
    (showFileFolderCover ? 1 : 0);
  const activeTextFontSizePt = activeTextFontTarget
    ? (settings.fontSizeOverridesPt[activeTextFontTarget.key] ??
      activeTextFontTarget.baseSizePt)
    : null;

  const effectiveSelectedFileFolderEntryId =
    settings.fileFolder.entries.some(
      (entry) => entry.id === selectedFileFolderEntryId,
    )
      ? selectedFileFolderEntryId
      : (settings.fileFolder.entries[0]?.id ?? null);

  const firstExpenseEntry = settings.entries[0];
  const sharedSchoolYear = settings.entries.every(
    (entry) => entry.schoolYear === firstExpenseEntry?.schoolYear,
  )
    ? (firstExpenseEntry?.schoolYear ?? "")
    : "";
  const sharedMonthText = settings.entries.every(
    (entry) => entry.monthText === firstExpenseEntry?.monthText,
  )
    ? (firstExpenseEntry?.monthText ?? "")
    : "";

  function updateSettings(
    patch: Partial<SchoolPrintSettings>,
    historyGroup: string | null = null,
  ) {
    setSettings(
      (current) => normalizeSettings({ ...current, ...patch }),
      historyGroup,
    );
  }

  function updateActiveTextFontSize(value: number) {
    if (!activeTextFontTarget) return;

    const stepped = Math.round(value / TEXT_FONT_STEP_PT) * TEXT_FONT_STEP_PT;
    const nextSize = clampNumber(
      Number(stepped.toFixed(1)),
      TEXT_FONT_MIN_PT,
      TEXT_FONT_MAX_PT,
    );
    setSettings((current) => ({
      ...current,
      fontSizeOverridesPt: {
        ...current.fontSizeOverridesPt,
        [activeTextFontTarget.key]: nextSize,
      },
    }));
  }

  function updateAllLabelText(
    patch: Partial<SharedLabelText>,
    historyGroup: string | null = null,
  ) {
    setSettings(
      (current) =>
        normalizeSettings({
          ...current,
          ...patch,
          entries: current.entries.map((entry) => ({ ...entry, ...patch })),
        }),
      historyGroup,
    );
  }

  function updateAllEntryDates(
    patch: Partial<Pick<LabelEntry, "schoolYear" | "monthText">>,
    historyGroup: string | null = null,
  ) {
    setSettings(
      (current) => ({
        ...current,
        entries: current.entries.map((entry) => ({ ...entry, ...patch })),
      }),
      historyGroup,
    );
  }

  function updateEntry(
    id: string,
    patch: Partial<LabelEntry>,
    historyGroup: string | null = null,
  ) {
    setSettings(
      (current) => ({
        ...current,
        entries: current.entries.map((entry) =>
          entry.id === id ? { ...entry, ...patch } : entry,
        ),
      }),
      historyGroup,
    );
  }

  function updateFileFolder(
    patch: Partial<FileFolderSettings>,
    historyGroup: string | null = null,
  ) {
    setSettings(
      (current) => ({
        ...current,
        fileFolder: normalizeFileFolderSettings({
          ...current.fileFolder,
          ...patch,
        }),
      }),
      historyGroup,
    );
  }

  function updateLedgerCover(
    patch: Partial<LedgerCoverSettings>,
    historyGroup: string | null = null,
  ) {
    setSettings(
      (current) => ({
        ...current,
        ledgerCover: normalizeLedgerCoverSettings({
          ...current.ledgerCover,
          ...patch,
        }),
      }),
      historyGroup,
    );
  }

  function updateFileFolderEntry(
    id: string,
    patch: Partial<FileFolderEntry>,
    historyGroup: string | null = null,
  ) {
    setSettings(
      (current) => ({
        ...current,
        fileFolder: {
          ...current.fileFolder,
          entries: current.fileFolder.entries.map((entry) =>
            entry.id === id ? { ...entry, ...patch } : entry,
          ),
        },
      }),
      historyGroup,
    );
  }

  function updateAllFileFolderInstitutions(
    institutionName: string,
    historyGroup: string | null = null,
  ) {
    setSettings(
      (current) => ({
        ...current,
        fileFolder: {
          ...current.fileFolder,
          coverInstitutionName: institutionName,
          entries: current.fileFolder.entries.map((entry) => ({
            ...entry,
            institutionName,
          })),
        },
      }),
      historyGroup,
    );
  }

  function startResize(
    kind: ResizeKind,
    slotIndex: number,
    event: ReactPointerEvent<HTMLButtonElement>,
    options: {
      axis: "x" | "y";
      direction?: 1 | -1;
      extraSnapTargets?: number[];
      maximum: number;
      minimum: number;
      startValue: number;
    },
  ) {
    const page = event.currentTarget.closest<HTMLElement>(".print-page");
    if (!page) return;

    const pageRect = page.getBoundingClientRect();
    const pageWidthMm = Number(page.dataset.pageWidthMm ?? 297);
    const pageHeightMm = Number(page.dataset.pageHeightMm ?? 210);
    const snapTargets = createResizeSnapTargets(
      options.minimum,
      options.maximum,
      5,
      options.extraSnapTargets ?? [],
    );
    const initialSnapTarget =
      snapTargets.find((target) => target === options.startValue) ?? null;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    historyGroupSequenceRef.current += 1;

    resizeSessionRef.current = {
      historyGroup: `resize-${event.pointerId}-${historyGroupSequenceRef.current}`,
      axis: options.axis,
      direction: options.direction ?? 1,
      kind,
      handle: event.currentTarget,
      lockedSnapTarget: initialSnapTarget,
      maximum: options.maximum,
      minimum: options.minimum,
      pointerId: event.pointerId,
      snapTargets,
      slotIndex,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startValue: options.startValue,
      mmPerPixelX: pageWidthMm / pageRect.width,
      mmPerPixelY: pageHeightMm / pageRect.height,
    };
    setActiveResize(kind);
    setResizeFeedback({
      kind,
      slotIndex,
      snapped: initialSnapTarget !== null,
      value: options.startValue,
    });
    document.body.classList.add(
      options.axis === "x" ? "resizing-column" : "resizing-row",
    );
  }

  function beginResize(
    kind: ResizeKind,
    slotIndex: number,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    const startValue =
      kind === "width"
        ? settings.labelWidthsMm[slotIndex] ?? settings.labelWidthsMm[0]
        : kind === "height"
          ? settings.labelHeightMm
          : kind === "top"
            ? settings.topBlockHeightMm
            : settings.footerBlockHeightMm;

    const extraSnapTargets =
      kind === "width"
        ? normalizeWidths(settings.labelWidthsMm, settings.labelsPerPage).filter(
            (_, index) => index !== slotIndex,
          )
        : kind === "height"
          ? [defaultSettings.labelHeightMm]
          : kind === "top"
            ? [defaultSettings.topBlockHeightMm]
            : [defaultSettings.footerBlockHeightMm];
    const [minimum, maximum] =
      kind === "width"
        ? [20, 80]
        : kind === "height"
          ? [140, 200]
          : kind === "top"
            ? [24, 56]
            : [28, 62];

    startResize(kind, slotIndex, event, {
      axis: kind === "width" ? "x" : "y",
      direction: kind === "footer" ? -1 : 1,
      extraSnapTargets,
      maximum,
      minimum,
      startValue,
    });
  }

  function beginFileFolderResize(
    kind: Extract<
      ResizeKind,
      "folder-width" | "folder-height" | "folder-top" | "folder-footer"
    >,
    slotIndex: number,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    const folder = settings.fileFolder;
    const startValue =
      kind === "folder-width"
        ? folder.labelWidthsMm[slotIndex] ?? folder.labelWidthsMm[0]
        : kind === "folder-height"
          ? folder.labelHeightMm
          : kind === "folder-top"
            ? folder.topBlockHeightMm
            : folder.footerBlockHeightMm;
    const extraSnapTargets =
      kind === "folder-width"
        ? normalizeFileFolderWidths(
            folder.labelWidthsMm,
            folder.labelsPerPage,
          ).filter((_, index) => index !== slotIndex)
        : kind === "folder-height"
          ? [defaultFileFolderSettings.labelHeightMm]
          : kind === "folder-top"
            ? [defaultFileFolderSettings.topBlockHeightMm]
            : [defaultFileFolderSettings.footerBlockHeightMm];
    const [minimum, maximum] =
      kind === "folder-width"
        ? [10, 30]
        : kind === "folder-height"
          ? [180, 265]
          : kind === "folder-top"
            ? [45, 90]
            : [35, 80];

    startResize(kind, slotIndex, event, {
      axis: kind === "folder-width" ? "x" : "y",
      direction: kind === "folder-footer" ? -1 : 1,
      extraSnapTargets,
      maximum,
      minimum,
      startValue,
    });
  }

  function beginCoverResize(
    kind: Extract<
      ResizeKind,
      | "cover-title-width"
      | "cover-title-height"
      | "cover-year-width"
      | "cover-year-height"
      | "cover-institution-width"
      | "cover-institution-height"
    >,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    const folder = settings.fileFolder;
    const definitions = {
      "cover-title-width": [folder.coverTitleWidthMm, 80, 180],
      "cover-title-height": [folder.coverTitleHeightMm, 20, 65],
      "cover-year-width": [folder.coverYearWidthMm, 40, 150],
      "cover-year-height": [folder.coverYearHeightMm, 15, 50],
      "cover-institution-width": [folder.coverInstitutionWidthMm, 50, 160],
      "cover-institution-height": [folder.coverInstitutionHeightMm, 20, 55],
    } as const;
    const defaults = {
      "cover-title-width": defaultFileFolderSettings.coverTitleWidthMm,
      "cover-title-height": defaultFileFolderSettings.coverTitleHeightMm,
      "cover-year-width": defaultFileFolderSettings.coverYearWidthMm,
      "cover-year-height": defaultFileFolderSettings.coverYearHeightMm,
      "cover-institution-width":
        defaultFileFolderSettings.coverInstitutionWidthMm,
      "cover-institution-height":
        defaultFileFolderSettings.coverInstitutionHeightMm,
    } as const;
    const [startValue, minimum, maximum] = definitions[kind];

    startResize(kind, 0, event, {
      axis: kind.endsWith("width") ? "x" : "y",
      extraSnapTargets: [defaults[kind]],
      maximum,
      minimum,
      startValue,
    });
  }

  function beginLedgerResize(
    kind: LedgerResizeKind,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    const cover = settings.ledgerCover;
    const definitions = {
      "ledger-frame-width": [cover.frameWidthMm, 150, 200],
      "ledger-frame-height": [cover.frameHeightMm, 180, 245],
      "ledger-info-width": [cover.infoWidthMm, 55, 150],
      "ledger-info-height": [cover.infoHeightMm, 14, 40],
      "ledger-title-width": [cover.titleWidthMm, 80, 185],
      "ledger-title-height": [cover.titleHeightMm, 20, 70],
      "ledger-footer-width": [cover.footerWidthMm, 60, 160],
      "ledger-footer-height": [cover.footerHeightMm, 16, 45],
    } as const;
    const defaults = {
      "ledger-frame-width": defaultLedgerCoverSettings.frameWidthMm,
      "ledger-frame-height": defaultLedgerCoverSettings.frameHeightMm,
      "ledger-info-width": defaultLedgerCoverSettings.infoWidthMm,
      "ledger-info-height": defaultLedgerCoverSettings.infoHeightMm,
      "ledger-title-width": defaultLedgerCoverSettings.titleWidthMm,
      "ledger-title-height": defaultLedgerCoverSettings.titleHeightMm,
      "ledger-footer-width": defaultLedgerCoverSettings.footerWidthMm,
      "ledger-footer-height": defaultLedgerCoverSettings.footerHeightMm,
    } as const;
    const [startValue, minimum, maximum] = definitions[kind];

    startResize(kind, 0, event, {
      axis: kind.endsWith("width") ? "x" : "y",
      extraSnapTargets: [defaults[kind]],
      maximum,
      minimum,
      startValue,
    });
  }

  function setLabelsPerPage(
    value: number,
    historyGroup: string | null = null,
  ) {
    const labelsPerPage = clampNumber(value, 1, MAX_LABELS_PER_PAGE);
    setSettings(
      (current) => ({
        ...current,
        labelsPerPage,
        labelWidthsMm: normalizeWidths(current.labelWidthsMm, labelsPerPage),
      }),
      historyGroup,
    );
  }

  function setFileFolderLabelsPerPage(
    value: number,
    historyGroup: string | null = null,
  ) {
    const labelsPerPage = clampNumber(
      value,
      1,
      MAX_FILE_FOLDER_LABELS_PER_PAGE,
    );
    setSettings(
      (current) => ({
        ...current,
        fileFolder: {
          ...current.fileFolder,
          labelsPerPage,
          labelWidthsMm: normalizeFileFolderWidths(
            current.fileFolder.labelWidthsMm,
            labelsPerPage,
          ),
        },
      }),
      historyGroup,
    );
  }

  function resetTemplate() {
    if (activeTemplate === "expense") {
      setSettings((current) => ({
        ...defaultSettings,
        entries: defaultEntries.map((entry) => ({ ...entry })),
        labelWidthsMm: [...defaultSettings.labelWidthsMm],
        fontSizeOverridesPt: clearTemplateFontSizeOverrides(
          current.fontSizeOverridesPt,
          "expense",
        ),
        fileFolder: current.fileFolder,
        ledgerCover: current.ledgerCover,
      }));
      setActiveTextFontTarget(null);
      setNotice("기본 지출증빙서 측면 라벨 예시로 되돌렸습니다.");
      return;
    }

    if (activeTemplate === "ledger-cover") {
      setSettings((current) => ({
        ...current,
        fontSizeOverridesPt: clearTemplateFontSizeOverrides(
          current.fontSizeOverridesPt,
          "ledger-cover",
        ),
        ledgerCover: cloneDefaultLedgerCoverSettings(),
      }));
      setActiveTextFontTarget(null);
      setNotice("급여대장 표지 원본의 기본 예시로 되돌렸습니다.");
      return;
    }

    setSettings((current) => ({
      ...current,
      fontSizeOverridesPt: clearTemplateFontSizeOverrides(
        current.fontSizeOverridesPt,
        "file-folder",
      ),
      fileFolder: cloneDefaultFileFolderSettings(),
    }));
    setActiveTextFontTarget(null);
    setNotice("파일철 편철 예시의 기본 라벨과 표지로 되돌렸습니다.");
  }

  function resetLayoutToDefaults() {
    if (activeTemplate === "file-folder") {
      setSettings((current) => ({
        ...current,
        fontSizeOverridesPt: clearTemplateFontSizeOverrides(
          current.fontSizeOverridesPt,
          "file-folder",
        ),
        fileFolder: {
          ...current.fileFolder,
          labelsPerPage: defaultFileFolderSettings.labelsPerPage,
          labelWidthsMm: [...defaultFileFolderSettings.labelWidthsMm],
          labelGapMm: defaultFileFolderSettings.labelGapMm,
          labelHeightMm: defaultFileFolderSettings.labelHeightMm,
          titleFontSizePt: defaultFileFolderSettings.titleFontSizePt,
          bodyFontSizePt: defaultFileFolderSettings.bodyFontSizePt,
          institutionFontSizePt:
            defaultFileFolderSettings.institutionFontSizePt,
          topBlockHeightMm: defaultFileFolderSettings.topBlockHeightMm,
          footerBlockHeightMm: defaultFileFolderSettings.footerBlockHeightMm,
          coverTitleFontSizePt:
            defaultFileFolderSettings.coverTitleFontSizePt,
          coverYearFontSizePt:
            defaultFileFolderSettings.coverYearFontSizePt,
          coverInstitutionFontSizePt:
            defaultFileFolderSettings.coverInstitutionFontSizePt,
          coverTitleWidthMm: defaultFileFolderSettings.coverTitleWidthMm,
          coverTitleHeightMm: defaultFileFolderSettings.coverTitleHeightMm,
          coverYearWidthMm: defaultFileFolderSettings.coverYearWidthMm,
          coverYearHeightMm: defaultFileFolderSettings.coverYearHeightMm,
          coverInstitutionWidthMm:
            defaultFileFolderSettings.coverInstitutionWidthMm,
          coverInstitutionHeightMm:
            defaultFileFolderSettings.coverInstitutionHeightMm,
        },
      }));
      setActiveTextFontTarget(null);
      setNotice("입력 내용은 유지하고 파일철 크기만 기본값으로 되돌렸습니다.");
      return;
    }

    if (activeTemplate === "ledger-cover") {
      setSettings((current) => ({
        ...current,
        fontSizeOverridesPt: clearTemplateFontSizeOverrides(
          current.fontSizeOverridesPt,
          "ledger-cover",
        ),
        ledgerCover: {
          ...current.ledgerCover,
          infoFontSizePt: defaultLedgerCoverSettings.infoFontSizePt,
          titleFontSizePt: defaultLedgerCoverSettings.titleFontSizePt,
          footerFontSizePt: defaultLedgerCoverSettings.footerFontSizePt,
          frameWidthMm: defaultLedgerCoverSettings.frameWidthMm,
          frameHeightMm: defaultLedgerCoverSettings.frameHeightMm,
          infoWidthMm: defaultLedgerCoverSettings.infoWidthMm,
          infoHeightMm: defaultLedgerCoverSettings.infoHeightMm,
          titleWidthMm: defaultLedgerCoverSettings.titleWidthMm,
          titleHeightMm: defaultLedgerCoverSettings.titleHeightMm,
          footerWidthMm: defaultLedgerCoverSettings.footerWidthMm,
          footerHeightMm: defaultLedgerCoverSettings.footerHeightMm,
        },
      }));
      setActiveTextFontTarget(null);
      setNotice("입력 내용은 유지하고 표지 크기만 기본값으로 되돌렸습니다.");
      return;
    }

    setSettings((current) => ({
      ...current,
      fontSizeOverridesPt: clearTemplateFontSizeOverrides(
        current.fontSizeOverridesPt,
        "expense",
      ),
      labelsPerPage: defaultSettings.labelsPerPage,
      labelWidthsMm: [...defaultSettings.labelWidthsMm],
      labelGapMm: defaultSettings.labelGapMm,
      labelHeightMm: defaultSettings.labelHeightMm,
      titleFontSizePt: defaultSettings.titleFontSizePt,
      bodyFontSizePt: defaultSettings.bodyFontSizePt,
      topBlockHeightMm: defaultSettings.topBlockHeightMm,
      footerBlockHeightMm: defaultSettings.footerBlockHeightMm,
    }));
    setActiveTextFontTarget(null);
    setNotice("입력 내용은 유지하고 크기 설정만 기본값으로 되돌렸습니다.");
  }

  function resetColorsToDefaults() {
    if (activeTemplate === "file-folder") {
      updateFileFolder({
        captionCellColor: defaultFileFolderSettings.captionCellColor,
        valueCellColor: defaultFileFolderSettings.valueCellColor,
        titleAreaColor: defaultFileFolderSettings.titleAreaColor,
        institutionAreaColor:
          defaultFileFolderSettings.institutionAreaColor,
        coverBoxColor: defaultFileFolderSettings.coverBoxColor,
      });
      setNotice("파일철 서식의 칸 색상을 기본색으로 되돌렸습니다.");
      return;
    }

    if (activeTemplate === "ledger-cover") {
      updateLedgerCover({
        pageColor: defaultLedgerCoverSettings.pageColor,
        infoAreaColor: defaultLedgerCoverSettings.infoAreaColor,
        titleAreaColor: defaultLedgerCoverSettings.titleAreaColor,
        footerAreaColor: defaultLedgerCoverSettings.footerAreaColor,
      });
      setNotice("급여·징수결의서 표지 색상을 기본색으로 되돌렸습니다.");
      return;
    }

    updateSettings({
      headerCellColor: defaultSettings.headerCellColor,
      periodCellColor: defaultSettings.periodCellColor,
      titleAreaColor: defaultSettings.titleAreaColor,
      footerCellColor: defaultSettings.footerCellColor,
    });
    setNotice("지출증빙서 칸 색상을 기본색으로 되돌렸습니다.");
  }

  function toggleColorMode() {
    const nextColorMode = !colorMode;
    setColorMode(nextColorMode);
    setNotice(
      nextColorMode
        ? "색상을 바꿀 칸을 미리보기에서 선택하세요."
        : "칸 색상 선택을 마쳤습니다.",
    );
  }

  function openColorPicker(
    target: ColorTarget,
    currentColor: string,
    event: ReactPointerEvent<HTMLElement>,
  ) {
    if (!colorMode) return;

    event.preventDefault();
    event.stopPropagation();
    colorTargetRef.current = target;

    const input = colorInputRef.current;
    if (!input) return;
    input.value = currentColor;
    input.click();
  }

  function applyPickedColor(event: ChangeEvent<HTMLInputElement>) {
    const target = colorTargetRef.current;
    if (!target) return;

    const color = normalizeColor(event.target.value, "#ffffff");
    if (target.template === "expense") {
      updateSettings({ [target.field]: color } as Partial<SchoolPrintSettings>);
    } else if (target.template === "file-folder") {
      updateFileFolder({
        [target.field]: color,
      } as Partial<FileFolderSettings>);
    } else {
      updateLedgerCover({
        [target.field]: color,
      } as Partial<LedgerCoverSettings>);
    }
    setNotice("선택한 칸의 색상을 변경했습니다.");
  }

  function selectTemplate(template: TemplateId) {
    if (template === activeTemplate) return;
    dispatchSettingsHistory({ type: "replace", settings });
    setActiveTemplate(template);
    setColorMode(false);
    setActiveTextFontTarget(null);
    const templateNotice: Record<TemplateId, string> = {
      expense: "지출증빙서 측면 라벨을 열었습니다.",
      "file-folder": "파일철 측면 라벨과 앞표지를 열었습니다.",
      "ledger-cover": "급여대장·징수결의서 표지를 열었습니다.",
    };
    setNotice(templateNotice[template]);
  }

  return (
    <main className="print-forms-root app-shell">
      <section className="workspace" aria-label="학교 출력물 서식 편집기">
        <aside className="control-panel">
          <div className="brand-block">
            <a className="editor-back-link" href="/">
              경기교행 업무도우미로 돌아가기
            </a>
            <p className="eyebrow">학교 출력물 서식</p>
            <h1>편철·라벨 출력 편집기</h1>
            <p>
              값을 입력하면 선택한 A4 미리보기에 바로 반영됩니다. 입력값은 서버로
              보내지지 않습니다.
            </p>
          </div>

          <section className="panel-section">
            <h2>서식 선택</h2>
            <div className="template-list">
              <button
                className={`template-card${
                  activeTemplate === "expense" ? " active" : ""
                }`}
                onClick={() => selectTemplate("expense")}
                type="button"
              >
                <strong>지출증빙서 측면 라벨</strong>
                <span>A4 가로 · 인쇄</span>
              </button>
              <button
                className={`template-card${
                  activeTemplate === "file-folder" ? " active" : ""
                }`}
                onClick={() => selectTemplate("file-folder")}
                type="button"
              >
                <strong>파일철 편철 서식</strong>
                <span>A4 세로 · 측면 라벨 + 앞표지</span>
              </button>
              <button
                className={`template-card${
                  activeTemplate === "ledger-cover" ? " active" : ""
                }`}
                onClick={() => selectTemplate("ledger-cover")}
                type="button"
              >
                <strong>급여대장·징수결의서 표지</strong>
                <span>A4 세로 · 공통 앞표지</span>
              </button>
              <button className="template-card muted" type="button" disabled>
                <strong>점검·대장류</strong>
                <span>다음 버전</span>
              </button>
            </div>
          </section>

          {activeTemplate === "expense" ? (
            <section className="panel-section">
            <div className="section-title-row">
              <h2>기본 정보</h2>
              <span className="local-badge">내 PC 저장</span>
            </div>
            <div className="form-grid">
              <label>
                기관명
                <input
                  value={settings.institutionName}
                  onBlur={endHistoryGroup}
                  onChange={(event) =>
                    updateAllLabelText(
                      { institutionName: event.target.value },
                      "shared-institution-name",
                    )
                  }
                />
              </label>
              <label>
                제목
                <input
                  value={settings.documentTitle}
                  onBlur={endHistoryGroup}
                  onChange={(event) =>
                    updateAllLabelText(
                      { documentTitle: event.target.value },
                      "shared-document-title",
                    )
                  }
                />
              </label>
              <label>
                학년도
                <input
                  placeholder="라벨별 값이 다름"
                  value={sharedSchoolYear}
                  onBlur={endHistoryGroup}
                  onChange={(event) =>
                    updateAllEntryDates(
                      { schoolYear: event.target.value },
                      "shared-school-year",
                    )
                  }
                />
              </label>
              <label>
                월
                <input
                  placeholder="라벨별 값이 다름"
                  value={sharedMonthText}
                  onBlur={endHistoryGroup}
                  onChange={(event) =>
                    updateAllEntryDates(
                      { monthText: event.target.value },
                      "shared-month-text",
                    )
                  }
                />
              </label>
              <label>
                보존기간
                <input
                  value={settings.retentionPeriod}
                  onBlur={endHistoryGroup}
                  onChange={(event) =>
                    updateAllLabelText(
                      { retentionPeriod: event.target.value },
                      "shared-retention-period",
                    )
                  }
                />
              </label>
              <label>
                한 페이지 라벨 수
                <input
                  min={1}
                  max={MAX_LABELS_PER_PAGE}
                  type="number"
                  value={settings.labelsPerPage}
                  onBlur={endHistoryGroup}
                  onChange={(event) =>
                    setLabelsPerPage(
                      Number(event.target.value),
                      "labels-per-page",
                    )
                  }
                />
              </label>
            </div>
            </section>
          ) : activeTemplate === "file-folder" ? (
            <FileFolderControls
              endHistoryGroup={endHistoryGroup}
              onSetLabelsPerPage={setFileFolderLabelsPerPage}
              onUpdate={updateFileFolder}
              onUpdateAllInstitutions={updateAllFileFolderInstitutions}
              settings={settings.fileFolder}
            />
          ) : (
            <LedgerCoverControls
              endHistoryGroup={endHistoryGroup}
              onResetLayout={resetLayoutToDefaults}
              onUpdate={updateLedgerCover}
              settings={settings.ledgerCover}
            />
          )}
        </aside>

        <TextFontEditingContext.Provider
          value={{
            activate: (target) => setActiveTextFontTarget(target),
            overrides: settings.fontSizeOverridesPt,
            template: activeTemplate,
          }}
        >
          <section className="preview-panel">
          <header className="preview-toolbar">
            <div>
              <p className="eyebrow">미리보기</p>
              <h2>
                {activeTemplate === "expense"
                  ? `A4 가로 · ${pages.length}쪽`
                  : activeTemplate === "file-folder"
                    ? `A4 세로 · ${fileFolderVisiblePageCount}쪽`
                    : "A4 세로 · 1쪽"}
              </h2>
            </div>
            <div className="toolbar-actions">
              <button
                aria-label="되돌리기"
                className="icon-button"
                disabled={!canUndo}
                onClick={undoSettings}
                title="되돌리기 (Ctrl+Z)"
                type="button"
              >
                <span aria-hidden="true">↶</span>
              </button>
              <button
                aria-label="다시 실행"
                className="icon-button"
                disabled={!canRedo}
                onClick={redoSettings}
                title="다시 실행 (Ctrl+Shift+Z 또는 Ctrl+Y)"
                type="button"
              >
                <span aria-hidden="true">↷</span>
              </button>
              {activeTemplate === "file-folder" ? (
                <div className="print-scope-field">
                  <span className="print-scope-label">출력 범위</span>
                  <div
                    aria-label="파일철 인쇄 범위"
                    className="print-scope-control"
                    role="group"
                  >
                    <button
                      aria-pressed={fileFolderPrintScope === "all"}
                      className={fileFolderPrintScope === "all" ? "active" : ""}
                      onClick={() => setFileFolderPrintScope("all")}
                      type="button"
                    >
                      모두
                    </button>
                    <button
                      aria-pressed={fileFolderPrintScope === "labels"}
                      className={
                        fileFolderPrintScope === "labels" ? "active" : ""
                      }
                      onClick={() => setFileFolderPrintScope("labels")}
                      type="button"
                    >
                      측면 라벨
                    </button>
                    <button
                      aria-pressed={fileFolderPrintScope === "cover"}
                      className={
                        fileFolderPrintScope === "cover" ? "active" : ""
                      }
                      onClick={() => setFileFolderPrintScope("cover")}
                      type="button"
                    >
                      앞표지
                    </button>
                  </div>
                </div>
              ) : null}
              <SelectedFontSizeControl
                currentSizePt={activeTextFontSizePt}
                label={activeTextFontTarget?.label ?? null}
                onChange={updateActiveTextFontSize}
              />
              <button
                aria-pressed={colorMode}
                className={`color-mode-button${colorMode ? " active" : ""}`}
                onClick={toggleColorMode}
                title="미리보기에서 칸을 눌러 색상을 선택합니다."
                type="button"
              >
                칸 색상
              </button>
              {colorMode ? (
                <button onClick={resetColorsToDefaults} type="button">
                  기본색
                </button>
              ) : null}
              <input
                ref={colorInputRef}
                aria-label="선택한 칸 색상"
                hidden
                onChange={applyPickedColor}
                type="color"
              />
              <button type="button" onClick={resetTemplate}>
                초기화
              </button>
              <button className="primary-button" type="button" onClick={() => window.print()}>
                인쇄
              </button>
            </div>
          </header>

          <p className="notice" aria-live="polite">
            {notice}
          </p>

          <div className="print-preview" aria-label="인쇄 미리보기">
            {activeTemplate === "expense" ? (
              pages.map((pageEntries, pageIndex) => (
                <section
                  className="print-page expense-page"
                  data-page-height-mm="210"
                  data-page-width-mm="297"
                  key={`expense-page-${pageIndex}`}
                >
                  <div
                    className="label-strip"
                    style={
                      {
                        "--label-gap": `${settings.labelGapMm}mm`,
                      } as React.CSSProperties
                    }
                  >
                    {pageEntries.map((entry, entryIndex) => (
                      <SideLabel
                        colorMode={colorMode}
                        entry={entry}
                        key={entry.id}
                        onColorPick={(field, color, event) =>
                          openColorPicker(
                            { template: "expense", field },
                            color,
                            event,
                          )
                        }
                        onEntryChange={(patch) => updateEntry(entry.id, patch)}
                        onResizeStart={(kind, event) =>
                          beginResize(kind, entryIndex, event)
                        }
                        resizeFeedback={
                          resizeFeedback?.slotIndex === entryIndex
                            ? resizeFeedback
                            : null
                        }
                        resizing={activeResize}
                        settings={settings}
                        slotIndex={entryIndex}
                      />
                    ))}
                  </div>
                </section>
              ))
            ) : activeTemplate === "file-folder" ? (
              <>
                {showFileFolderLabels
                  ? fileFolderPages.map((pageEntries, pageIndex) => (
                      <section
                        className="print-page file-folder-page"
                        data-page-height-mm="297"
                        data-page-width-mm="210"
                        key={`file-folder-page-${pageIndex}`}
                      >
                        <div
                          className="file-folder-strip"
                          style={
                            {
                              "--folder-gap": `${settings.fileFolder.labelGapMm}mm`,
                            } as React.CSSProperties
                          }
                        >
                          {pageEntries.map((entry, entryIndex) => (
                            <FileFolderSideLabel
                              colorMode={colorMode}
                              entry={entry}
                              key={entry.id}
                              onColorPick={(field, color, event) =>
                                openColorPicker(
                                  { template: "file-folder", field },
                                  color,
                                  event,
                                )
                              }
                              onEntryChange={(patch) =>
                                updateFileFolderEntry(entry.id, patch)
                              }
                              onSelect={() =>
                                setSelectedFileFolderEntryId(entry.id)
                              }
                              onResizeStart={(kind, event) =>
                                beginFileFolderResize(kind, entryIndex, event)
                              }
                              resizeFeedback={
                                resizeFeedback?.slotIndex === entryIndex
                                  ? resizeFeedback
                                  : null
                              }
                              resizing={activeResize}
                              settings={settings.fileFolder}
                              selected={
                                entry.id === effectiveSelectedFileFolderEntryId
                              }
                              slotIndex={entryIndex}
                            />
                          ))}
                        </div>
                      </section>
                    ))
                  : null}
                {showFileFolderCover ? (
                  <FileFolderCoverPage
                    colorMode={colorMode}
                    onColorPick={(field, color, event) =>
                      openColorPicker(
                        { template: "file-folder", field },
                        color,
                        event,
                      )
                    }
                    onChange={(patch) => updateFileFolder(patch)}
                    onResizeStart={beginCoverResize}
                    resizeFeedback={
                      resizeFeedback?.kind.startsWith("cover-")
                        ? resizeFeedback
                        : null
                    }
                    resizing={activeResize}
                    settings={settings.fileFolder}
                  />
                ) : null}
              </>
            ) : (
              <LedgerCoverPage
                colorMode={colorMode}
                onColorPick={(field, color, event) =>
                  openColorPicker(
                    { template: "ledger-cover", field },
                    color,
                    event,
                  )
                }
                onResizeStart={beginLedgerResize}
                onUpdate={updateLedgerCover}
                resizeFeedback={
                  resizeFeedback?.kind.startsWith("ledger-")
                    ? resizeFeedback
                    : null
                }
                resizing={activeResize}
                settings={settings.ledgerCover}
              />
            )}
          </div>
          </section>
        </TextFontEditingContext.Provider>
      </section>
    </main>
  );
}

function SelectedFontSizeControl({
  currentSizePt,
  label,
  onChange,
}: {
  currentSizePt: number | null;
  label: string | null;
  onChange: (value: number) => void;
}) {
  const disabled = currentSizePt === null;
  const targetDescription = label
    ? `${label} 글자 크기`
    : "미리보기에서 선택한 글자 크기";

  return (
    <div
      aria-label={targetDescription}
      className="selected-font-size-control"
      role="group"
      title={label ?? "미리보기 글자를 선택하세요"}
    >
      <span className="selected-font-size-label">글자 크기</span>
      <button
        aria-label="선택한 글자 작게"
        className="font-size-step-button"
        disabled={disabled}
        onClick={() =>
          onChange(
            (currentSizePt ?? TEXT_FONT_MIN_PT) - TEXT_FONT_STEP_PT,
          )
        }
        onPointerDown={(event) => event.preventDefault()}
        title="0.5pt 작게"
        type="button"
      >
        <span aria-hidden="true">−</span>
      </button>
      {currentSizePt === null ? (
        <span className="numeric-field selected-font-size-value">
          <input aria-label="선택한 글자 크기" disabled placeholder="--" />
          <span aria-hidden="true">pt</span>
        </span>
      ) : (
        <NumberInput
          ariaLabel={targetDescription}
          max={TEXT_FONT_MAX_PT}
          min={TEXT_FONT_MIN_PT}
          onCommit={onChange}
          step={TEXT_FONT_STEP_PT}
          unit="pt"
          value={currentSizePt}
        />
      )}
      <button
        aria-label="선택한 글자 크게"
        className="font-size-step-button"
        disabled={disabled}
        onClick={() =>
          onChange(
            (currentSizePt ?? TEXT_FONT_MIN_PT) + TEXT_FONT_STEP_PT,
          )
        }
        onPointerDown={(event) => event.preventDefault()}
        title="0.5pt 크게"
        type="button"
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}

function LedgerCoverControls({
  endHistoryGroup,
  onResetLayout,
  onUpdate,
  settings,
}: {
  endHistoryGroup: () => void;
  onResetLayout: () => void;
  onUpdate: (
    patch: Partial<LedgerCoverSettings>,
    historyGroup?: string | null,
  ) => void;
  settings: LedgerCoverSettings;
}) {
  const [sizeExpanded, setSizeExpanded] = useState(false);

  return (
    <>
      <section className="panel-section">
        <div className="section-title-row">
          <h2>기본 정보</h2>
          <span className="local-badge">내 PC 저장</span>
        </div>
        <div className="form-grid">
          <label>
            학년도
            <input
              value={settings.academicYear}
              onBlur={endHistoryGroup}
              onChange={(event) =>
                onUpdate(
                  { academicYear: event.target.value },
                  "ledger-academic-year",
                )
              }
            />
          </label>
          <label>
            관서명
            <input
              value={settings.institutionName}
              onBlur={endHistoryGroup}
              onChange={(event) =>
                onUpdate(
                  { institutionName: event.target.value },
                  "ledger-institution-name",
                )
              }
            />
          </label>
          <label className="wide-field">
            기간
            <input
              value={settings.periodText}
              onBlur={endHistoryGroup}
              onChange={(event) =>
                onUpdate(
                  { periodText: event.target.value },
                  "ledger-period-text",
                )
              }
            />
          </label>
          <label className="wide-field">
            표지 제목
            <input
              value={settings.title}
              onBlur={endHistoryGroup}
              onChange={(event) =>
                onUpdate({ title: event.target.value }, "ledger-title")
              }
            />
          </label>
          <label>
            권차
            <input
              value={settings.volumeText}
              onBlur={endHistoryGroup}
              onChange={(event) =>
                onUpdate(
                  { volumeText: event.target.value },
                  "ledger-volume-text",
                )
              }
            />
          </label>
          <label>
            관서명 문구
            <input
              value={settings.agencyCaption}
              onBlur={endHistoryGroup}
              onChange={(event) =>
                onUpdate(
                  { agencyCaption: event.target.value },
                  "ledger-agency-caption",
                )
              }
            />
          </label>
        </div>
      </section>

      <section className="panel-section">
        <div className="section-title-row size-section-heading">
          <h2>표지 크기 조정</h2>
          <div className="section-title-actions">
            {sizeExpanded ? (
              <button
                className="ghost-button"
                onClick={onResetLayout}
                title="내용은 유지하고 원본 크기로 되돌립니다."
                type="button"
              >
                크기 초기화
              </button>
            ) : null}
            <button
              aria-expanded={sizeExpanded}
              className="ghost-button"
              onClick={() => setSizeExpanded((current) => !current)}
              type="button"
            >
              {sizeExpanded ? "크기 접기" : "크기 열기"}
            </button>
          </div>
        </div>

        {sizeExpanded ? (
          <>
            <dl className="default-size-summary" aria-label="급여대장 표지 원본 크기">
              <div>
                <dt>글자</dt>
                <dd>
                  제목 {defaultLedgerCoverSettings.titleFontSizePt}pt · 정보{" "}
                  {defaultLedgerCoverSettings.infoFontSizePt}pt
                </dd>
              </div>
              <div>
                <dt>외곽 틀</dt>
                <dd>
                  {defaultLedgerCoverSettings.frameWidthMm} ×{" "}
                  {defaultLedgerCoverSettings.frameHeightMm}mm
                </dd>
              </div>
              <div>
                <dt>상단</dt>
                <dd>
                  {defaultLedgerCoverSettings.infoWidthMm} ×{" "}
                  {defaultLedgerCoverSettings.infoHeightMm}mm
                </dd>
              </div>
              <div>
                <dt>제목</dt>
                <dd>
                  {defaultLedgerCoverSettings.titleWidthMm} ×{" "}
                  {defaultLedgerCoverSettings.titleHeightMm}mm
                </dd>
              </div>
              <div className="default-widths">
                <dt>하단</dt>
                <dd>
                  {defaultLedgerCoverSettings.footerWidthMm} ×{" "}
                  {defaultLedgerCoverSettings.footerHeightMm}mm
                </dd>
              </div>
            </dl>

            <div className="range-grid">
              <RangeNumberControl
                ariaLabel="표지 상단 글자 크기"
                group="ledger-info-font"
                label="상단 글자"
                max={28}
                min={10}
                onCommit={(infoFontSizePt, group) =>
                  onUpdate({ infoFontSizePt }, group)
                }
                onEndGroup={endHistoryGroup}
                step={0.5}
                unit="pt"
                value={settings.infoFontSizePt}
              />
              <RangeNumberControl
                ariaLabel="표지 제목 글자 크기"
                group="ledger-title-font"
                label="제목 글자"
                max={44}
                min={18}
                onCommit={(titleFontSizePt, group) =>
                  onUpdate({ titleFontSizePt }, group)
                }
                onEndGroup={endHistoryGroup}
                step={0.5}
                unit="pt"
                value={settings.titleFontSizePt}
              />
              <RangeNumberControl
                ariaLabel="표지 하단 글자 크기"
                group="ledger-footer-font"
                label="하단 글자"
                max={26}
                min={10}
                onCommit={(footerFontSizePt, group) =>
                  onUpdate({ footerFontSizePt }, group)
                }
                onEndGroup={endHistoryGroup}
                step={0.5}
                unit="pt"
                value={settings.footerFontSizePt}
              />
              <RangeNumberControl
                ariaLabel="표지 외곽 틀 너비"
                group="ledger-frame-width"
                label="외곽 너비"
                max={200}
                min={150}
                onCommit={(frameWidthMm, group) =>
                  onUpdate({ frameWidthMm }, group)
                }
                onEndGroup={endHistoryGroup}
                step={0.5}
                unit="mm"
                value={settings.frameWidthMm}
              />
              <RangeNumberControl
                ariaLabel="표지 외곽 틀 높이"
                group="ledger-frame-height"
                label="외곽 높이"
                max={245}
                min={180}
                onCommit={(frameHeightMm, group) =>
                  onUpdate({ frameHeightMm }, group)
                }
                onEndGroup={endHistoryGroup}
                step={0.5}
                unit="mm"
                value={settings.frameHeightMm}
              />
              <RangeNumberControl
                ariaLabel="표지 상단 정보 너비"
                group="ledger-info-width"
                label="상단 너비"
                max={150}
                min={55}
                onCommit={(infoWidthMm, group) =>
                  onUpdate({ infoWidthMm }, group)
                }
                onEndGroup={endHistoryGroup}
                step={0.5}
                unit="mm"
                value={settings.infoWidthMm}
              />
              <RangeNumberControl
                ariaLabel="표지 상단 정보 높이"
                group="ledger-info-height"
                label="상단 높이"
                max={40}
                min={14}
                onCommit={(infoHeightMm, group) =>
                  onUpdate({ infoHeightMm }, group)
                }
                onEndGroup={endHistoryGroup}
                step={0.5}
                unit="mm"
                value={settings.infoHeightMm}
              />
              <RangeNumberControl
                ariaLabel="표지 제목 영역 너비"
                group="ledger-title-width"
                label="제목 너비"
                max={185}
                min={80}
                onCommit={(titleWidthMm, group) =>
                  onUpdate({ titleWidthMm }, group)
                }
                onEndGroup={endHistoryGroup}
                step={0.5}
                unit="mm"
                value={settings.titleWidthMm}
              />
              <RangeNumberControl
                ariaLabel="표지 제목 영역 높이"
                group="ledger-title-height"
                label="제목 높이"
                max={70}
                min={20}
                onCommit={(titleHeightMm, group) =>
                  onUpdate({ titleHeightMm }, group)
                }
                onEndGroup={endHistoryGroup}
                step={0.5}
                unit="mm"
                value={settings.titleHeightMm}
              />
              <RangeNumberControl
                ariaLabel="표지 하단 정보 너비"
                group="ledger-footer-width"
                label="하단 너비"
                max={160}
                min={60}
                onCommit={(footerWidthMm, group) =>
                  onUpdate({ footerWidthMm }, group)
                }
                onEndGroup={endHistoryGroup}
                step={0.5}
                unit="mm"
                value={settings.footerWidthMm}
              />
              <RangeNumberControl
                ariaLabel="표지 하단 정보 높이"
                group="ledger-footer-height"
                label="하단 높이"
                max={45}
                min={16}
                onCommit={(footerHeightMm, group) =>
                  onUpdate({ footerHeightMm }, group)
                }
                onEndGroup={endHistoryGroup}
                step={0.5}
                unit="mm"
                value={settings.footerHeightMm}
              />
            </div>
          </>
        ) : (
          <p className="collapsed-size-summary" aria-label="현재 표지 크기 요약">
            제목 {formatMeasurement(settings.titleFontSizePt)}pt · 외곽{" "}
            {formatMeasurement(settings.frameWidthMm)} ×{" "}
            {formatMeasurement(settings.frameHeightMm)}mm
          </p>
        )}
      </section>
    </>
  );
}

function FileFolderControls({
  endHistoryGroup,
  onSetLabelsPerPage,
  onUpdate,
  onUpdateAllInstitutions,
  settings,
}: {
  endHistoryGroup: () => void;
  onSetLabelsPerPage: (value: number, historyGroup?: string | null) => void;
  onUpdate: (
    patch: Partial<FileFolderSettings>,
    historyGroup?: string | null,
  ) => void;
  onUpdateAllInstitutions: (
    institutionName: string,
    historyGroup?: string | null,
  ) => void;
  settings: FileFolderSettings;
}) {
  return (
    <section className="panel-section">
      <div className="section-title-row">
        <h2>기본 정보</h2>
        <span className="local-badge">내 PC 저장</span>
      </div>
      <div className="form-grid">
        <label>
          기관명
          <input
            value={settings.coverInstitutionName}
            onBlur={endHistoryGroup}
            onChange={(event) =>
              onUpdateAllInstitutions(
                event.target.value,
                "folder-shared-institution",
              )
            }
          />
        </label>
        <label>
          표지 제목
          <input
            value={settings.coverTitle}
            onBlur={endHistoryGroup}
            onChange={(event) =>
              onUpdate(
                { coverTitle: event.target.value },
                "folder-cover-title",
              )
            }
          />
        </label>
        <label>
          표지 연도
          <input
            value={settings.coverYear}
            onBlur={endHistoryGroup}
            onChange={(event) =>
              onUpdate(
                { coverYear: event.target.value },
                "folder-cover-year",
              )
            }
          />
        </label>
        <label>
          한 페이지 라벨 수
          <input
            max={MAX_FILE_FOLDER_LABELS_PER_PAGE}
            min={1}
            onBlur={endHistoryGroup}
            onChange={(event) =>
              onSetLabelsPerPage(
                Number(event.target.value),
                "folder-labels-per-page",
              )
            }
            type="number"
            value={settings.labelsPerPage}
          />
        </label>
      </div>
    </section>
  );
}

function RangeNumberControl({
  ariaLabel,
  group,
  label,
  max,
  min,
  onCommit,
  onEndGroup,
  step,
  unit,
  value,
}: {
  ariaLabel: string;
  group: string;
  label: string;
  max: number;
  min: number;
  onCommit: (value: number, historyGroup?: string | null) => void;
  onEndGroup: () => void;
  step: number;
  unit: string;
  value: number;
}) {
  return (
    <label>
      {label}
      <input
        aria-label={`${ariaLabel} 슬라이더`}
        max={max}
        min={min}
        onBlur={onEndGroup}
        onChange={(event) => onCommit(Number(event.target.value), group)}
        onKeyUp={onEndGroup}
        onPointerCancel={onEndGroup}
        onPointerUp={onEndGroup}
        step={step}
        type="range"
        value={value}
      />
      <NumberInput
        ariaLabel={ariaLabel}
        max={max}
        min={min}
        onCommit={(nextValue) => onCommit(nextValue)}
        step={step}
        unit={unit}
        value={value}
      />
    </label>
  );
}

function formatMeasurement(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function SideLabel({
  colorMode,
  entry,
  onColorPick,
  onEntryChange,
  onResizeStart,
  resizeFeedback,
  resizing,
  settings,
  slotIndex,
}: {
  colorMode: boolean;
  entry: LabelEntry;
  onColorPick: (
    field: ExpenseColorField,
    color: string,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  onEntryChange: (patch: Partial<LabelEntry>) => void;
  onResizeStart: (
    kind: ResizeKind,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  resizeFeedback: ResizeFeedback | null;
  resizing: ResizeKind | null;
  settings: SchoolPrintSettings;
  slotIndex: number;
}) {
  const width = settings.labelWidthsMm[slotIndex] ?? settings.labelWidthsMm[0];

  return (
    <div
      className="label-slot"
      data-color-mode={colorMode || undefined}
      data-resizing={resizing ?? undefined}
      data-snapped={resizeFeedback?.snapped || undefined}
      style={
        {
          "--label-width": `${width}mm`,
          "--label-height": `${settings.labelHeightMm}mm`,
          "--title-size": `${settings.titleFontSizePt}pt`,
          "--body-size": `${settings.bodyFontSizePt}pt`,
          "--top-height": `${settings.topBlockHeightMm}mm`,
          "--footer-height": `${settings.footerBlockHeightMm}mm`,
          "--expense-header-color": settings.headerCellColor,
          "--expense-period-color": settings.periodCellColor,
          "--expense-title-color": settings.titleAreaColor,
          "--expense-footer-color": settings.footerCellColor,
        } as React.CSSProperties
      }
    >
      <article className="side-label">
        <div className="label-top" style={{ height: "var(--top-height)" }}>
          <div
            className="label-row shaded color-pick-region"
            onPointerDownCapture={(event) =>
              onColorPick("headerCellColor", settings.headerCellColor, event)
            }
          >
            <EditableText
              ariaLabel={`${slotIndex + 1}번 생산년도 문구`}
              fontKey={`${entry.id}:productionYearCaption`}
              value={entry.productionYearCaption}
              onCommit={(productionYearCaption) =>
                onEntryChange({ productionYearCaption })
              }
            />
          </div>
          <div
            className="label-row shaded strong color-pick-region"
            onPointerDownCapture={(event) =>
              onColorPick("headerCellColor", settings.headerCellColor, event)
            }
          >
            <EditableText
              ariaLabel={`${slotIndex + 1}번 학년도`}
              fontKey={`${entry.id}:schoolYear`}
              value={entry.schoolYear}
              onCommit={(schoolYear) => onEntryChange({ schoolYear })}
            />
          </div>
          <div
            className="label-period color-pick-region"
            onPointerDownCapture={(event) =>
              onColorPick("periodCellColor", settings.periodCellColor, event)
            }
          >
            <EditableText
              ariaLabel={`${slotIndex + 1}번 월`}
              fontKey={`${entry.id}:monthText`}
              value={entry.monthText}
              onCommit={(monthText) => onEntryChange({ monthText })}
            />
            <EditableText
              ariaLabel={`${slotIndex + 1}번 권차`}
              fontKey={`${entry.id}:volumeText`}
              value={entry.volumeText}
              onCommit={(volumeText) => onEntryChange({ volumeText })}
            />
            <EditableText
              ariaLabel={`${slotIndex + 1}번 기간`}
              fontKey={`${entry.id}:periodText`}
              value={entry.periodText}
              onCommit={(periodText) => onEntryChange({ periodText })}
            />
          </div>
        </div>

        <div
          className="label-title color-pick-region"
          onPointerDownCapture={(event) =>
            onColorPick("titleAreaColor", settings.titleAreaColor, event)
          }
        >
          <VerticalTitleEditor
            ariaLabel={`${slotIndex + 1}번 문서 제목`}
            fontKey={`${entry.id}:documentTitle`}
            value={entry.documentTitle.replace(/\s/g, "")}
            onCommit={(documentTitle) => onEntryChange({ documentTitle })}
          />
        </div>

        <div
          className="label-footer color-pick-region"
          onPointerDownCapture={(event) =>
            onColorPick("footerCellColor", settings.footerCellColor, event)
          }
          style={{ height: "var(--footer-height)" }}
        >
          <div className="label-row">
            <EditableText
              ariaLabel={`${slotIndex + 1}번 보존기간 문구`}
              fontKey={`${entry.id}:retentionPeriodCaption`}
              value={entry.retentionPeriodCaption}
              onCommit={(retentionPeriodCaption) =>
                onEntryChange({ retentionPeriodCaption })
              }
            />
          </div>
          <div className="label-row strong">
            <EditableText
              ariaLabel={`${slotIndex + 1}번 보존기간`}
              fontKey={`${entry.id}:retentionPeriod`}
              value={entry.retentionPeriod}
              onCommit={(retentionPeriod) => onEntryChange({ retentionPeriod })}
            />
          </div>
          <div className="label-row">
            <EditableText
              ariaLabel={`${slotIndex + 1}번 기관명 문구`}
              fontKey={`${entry.id}:institutionCaption`}
              value={entry.institutionCaption}
              onCommit={(institutionCaption) =>
                onEntryChange({ institutionCaption })
              }
            />
          </div>
          <div className="label-row institution">
            <EditableText
              ariaLabel={`${slotIndex + 1}번 기관명`}
              fontKey={`${entry.id}:institutionName`}
              value={entry.institutionName}
              onCommit={(institutionName) => onEntryChange({ institutionName })}
            />
          </div>
        </div>
      </article>

      {resizeFeedback ? (
        <output
          aria-live="polite"
          className={`resize-value-badge resize-value-badge-${resizeFeedback.kind}`}
          data-snapped={resizeFeedback.snapped || undefined}
        >
          {Number.isInteger(resizeFeedback.value)
            ? resizeFeedback.value
            : resizeFeedback.value.toFixed(1)}
          mm
        </output>
      ) : null}

      <button
        aria-label={`${slotIndex + 1}번 라벨 너비 조절`}
        className="drag-handle drag-handle-width"
        onPointerDown={(event) => onResizeStart("width", event)}
        title="너비 조절"
        type="button"
      />
      <button
        aria-label="상단 영역 높이 조절"
        className="drag-handle drag-handle-top"
        onPointerDown={(event) => onResizeStart("top", event)}
        title="상단 영역 높이 조절"
        type="button"
      />
      <button
        aria-label="하단 영역 높이 조절"
        className="drag-handle drag-handle-footer"
        onPointerDown={(event) => onResizeStart("footer", event)}
        title="하단 영역 높이 조절"
        type="button"
      />
      <button
        aria-label="라벨 전체 높이 조절"
        className="drag-handle drag-handle-height"
        onPointerDown={(event) => onResizeStart("height", event)}
        title="전체 높이 조절"
        type="button"
      />
    </div>
  );
}

function fitVerticalFontSize(
  value: string,
  availableHeightMm: number,
  maximumPt: number,
  gapMm: number,
  minimumPt: number,
) {
  const characterCount = Math.max(Array.from(value.replace(/\s/g, "")).length, 1);
  const gapHeight = Math.max(characterCount - 1, 0) * gapMm;
  const availableCharacterHeight = Math.max(availableHeightMm - gapHeight - 4, 1);
  const fittedPt = availableCharacterHeight / characterCount / 0.3528;
  return clampNumber(Number(fittedPt.toFixed(1)), minimumPt, maximumPt);
}

function FileFolderSideLabel({
  colorMode,
  entry,
  onColorPick,
  onEntryChange,
  onResizeStart,
  onSelect,
  resizeFeedback,
  resizing,
  selected,
  settings,
  slotIndex,
}: {
  colorMode: boolean;
  entry: FileFolderEntry;
  onColorPick: (
    field: FileFolderColorField,
    color: string,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  onEntryChange: (patch: Partial<FileFolderEntry>) => void;
  onResizeStart: (
    kind: Extract<
      ResizeKind,
      "folder-width" | "folder-height" | "folder-top" | "folder-footer"
    >,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  onSelect: () => void;
  resizeFeedback: ResizeFeedback | null;
  resizing: ResizeKind | null;
  selected: boolean;
  settings: FileFolderSettings;
  slotIndex: number;
}) {
  const width = settings.labelWidthsMm[slotIndex] ?? settings.labelWidthsMm[0];
  const titleValue = entry.documentTitle.replace(/\s/g, "");
  const institutionValue = entry.institutionName.replace(/\s/g, "");
  const titleAreaHeightMm = Math.max(
    settings.labelHeightMm -
      settings.topBlockHeightMm -
      settings.footerBlockHeightMm,
    20,
  );
  const institutionAreaHeightMm = Math.max(
    settings.footerBlockHeightMm - 10,
    15,
  );
  const titleGapMm = 0.8;
  const institutionGapMm = 0.8;
  const titleFontSizePt = fitVerticalFontSize(
    titleValue,
    titleAreaHeightMm,
    settings.titleFontSizePt,
    titleGapMm,
    9,
  );
  const institutionFontSizePt = fitVerticalFontSize(
    institutionValue,
    institutionAreaHeightMm,
    settings.institutionFontSizePt,
    institutionGapMm,
    9,
  );
  const feedbackPlacement =
    resizeFeedback?.kind === "folder-width"
      ? "width"
      : resizeFeedback?.kind === "folder-height"
        ? "height"
        : resizeFeedback?.kind === "folder-top"
          ? "top"
          : "footer";
  const colorByField: Record<FileFolderColorField, string> = {
    captionCellColor: settings.captionCellColor,
    valueCellColor: settings.valueCellColor,
    titleAreaColor: settings.titleAreaColor,
    institutionAreaColor: settings.institutionAreaColor,
    coverBoxColor: settings.coverBoxColor,
  };

  return (
    <div
      className="file-folder-slot"
      data-color-mode={colorMode || undefined}
      data-resizing={resizing?.startsWith("folder-") ? resizing : undefined}
      data-selected={selected || undefined}
      data-snapped={resizeFeedback?.snapped || undefined}
      onPointerDownCapture={(event) => {
        onSelect();
        if (!colorMode) return;
        const region = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-color-field]",
        );
        const field = region?.dataset.colorField as
          | FileFolderColorField
          | undefined;
        if (!region || !field || !event.currentTarget.contains(region)) return;
        onColorPick(field, colorByField[field], event);
      }}
      style={
        {
          "--folder-label-width": `${width}mm`,
          "--folder-label-height": `${settings.labelHeightMm}mm`,
          "--folder-body-size": `${settings.bodyFontSizePt}pt`,
          "--folder-top-height": `${settings.topBlockHeightMm}mm`,
          "--folder-footer-height": `${settings.footerBlockHeightMm}mm`,
          "--folder-title-size": `${titleFontSizePt}pt`,
          "--folder-institution-size": `${institutionFontSizePt}pt`,
          "--folder-caption-color": settings.captionCellColor,
          "--folder-value-color": settings.valueCellColor,
          "--folder-title-color": settings.titleAreaColor,
          "--folder-institution-color": settings.institutionAreaColor,
        } as React.CSSProperties
      }
    >
      <article className="file-folder-label">
        <div className="file-folder-top">
          <div
            className="file-folder-cell folder-caption folder-stacked-caption color-pick-region"
            data-color-field="captionCellColor"
          >
            <WrappedTextEditor
              ariaLabel={`${slotIndex + 1}번 관리번호 문구`}
              fontKey={`${entry.id}:managementCaption`}
              onCommit={(managementCaption) =>
                onEntryChange({ managementCaption })
              }
              value={entry.managementCaption}
            />
          </div>
          <div
            className="file-folder-cell folder-value color-pick-region"
            data-color-field="valueCellColor"
          >
            <EditableText
              ariaLabel={`${slotIndex + 1}번 관리번호`}
              fontKey={`${entry.id}:managementNumber`}
              onCommit={(managementNumber) =>
                onEntryChange({ managementNumber })
              }
              value={entry.managementNumber}
            />
          </div>
          <div
            className="file-folder-cell folder-caption folder-stacked-caption color-pick-region"
            data-color-field="captionCellColor"
          >
            <WrappedTextEditor
              ariaLabel={`${slotIndex + 1}번 생산연도 문구`}
              fontKey={`${entry.id}:productionYearCaption`}
              onCommit={(productionYearCaption) =>
                onEntryChange({ productionYearCaption })
              }
              value={entry.productionYearCaption}
            />
          </div>
          <div
            className="file-folder-cell folder-value color-pick-region"
            data-color-field="valueCellColor"
          >
            <EditableText
              ariaLabel={`${slotIndex + 1}번 생산연도`}
              fontKey={`${entry.id}:productionYear`}
              onCommit={(productionYear) => onEntryChange({ productionYear })}
              value={entry.productionYear}
            />
          </div>
          <div
            className="file-folder-cell folder-caption folder-stacked-caption color-pick-region"
            data-color-field="captionCellColor"
          >
            <WrappedTextEditor
              ariaLabel={`${slotIndex + 1}번 분류번호 문구`}
              fontKey={`${entry.id}:classificationCaption`}
              onCommit={(classificationCaption) =>
                onEntryChange({ classificationCaption })
              }
              value={entry.classificationCaption}
            />
          </div>
          <div
            className="file-folder-cell folder-value color-pick-region"
            data-color-field="valueCellColor"
          >
            <EditableText
              ariaLabel={`${slotIndex + 1}번 분류번호`}
              fontKey={`${entry.id}:classificationNumber`}
              onCommit={(classificationNumber) =>
                onEntryChange({ classificationNumber })
              }
              value={entry.classificationNumber}
            />
          </div>
          <div
            className="file-folder-cell folder-caption folder-title-caption color-pick-region"
            data-color-field="captionCellColor"
          >
            <WrappedTextEditor
              ariaLabel={`${slotIndex + 1}번 제목 문구`}
              fontKey={`${entry.id}:titleCaption`}
              onCommit={(titleCaption) => onEntryChange({ titleCaption })}
              value={entry.titleCaption}
            />
          </div>
        </div>

        <div
          className="file-folder-title-area color-pick-region"
          data-color-field="titleAreaColor"
        >
          <VerticalTitleEditor
            ariaLabel={`${slotIndex + 1}번 파일철 제목`}
            fontKey={`${entry.id}:documentTitle`}
            gapMm={titleGapMm}
            onCommit={(documentTitle) => onEntryChange({ documentTitle })}
            value={titleValue}
          />
        </div>

        <div className="file-folder-footer">
          <div
            className="file-folder-cell folder-caption color-pick-region"
            data-color-field="captionCellColor"
          >
            <WrappedTextEditor
              ariaLabel={`${slotIndex + 1}번 기관명 문구`}
              fontKey={`${entry.id}:institutionCaption`}
              onCommit={(institutionCaption) =>
                onEntryChange({ institutionCaption })
              }
              value={entry.institutionCaption}
            />
          </div>
          <div
            className="file-folder-institution-area color-pick-region"
            data-color-field="institutionAreaColor"
          >
            <VerticalTitleEditor
              ariaLabel={`${slotIndex + 1}번 기관명`}
              fontKey={`${entry.id}:institutionName`}
              gapMm={institutionGapMm}
              onCommit={(institutionName) =>
                onEntryChange({ institutionName })
              }
              value={institutionValue}
            />
          </div>
        </div>
      </article>

      {resizeFeedback ? (
        <output
          aria-live="polite"
          className={`resize-value-badge resize-value-badge-${feedbackPlacement}`}
          data-snapped={resizeFeedback.snapped || undefined}
        >
          {formatMeasurement(resizeFeedback.value)}mm
        </output>
      ) : null}

      <button
        aria-label={`${slotIndex + 1}번 파일철 라벨 너비 조절`}
        className="drag-handle drag-handle-width"
        onPointerDown={(event) => onResizeStart("folder-width", event)}
        title="너비 조절"
        type="button"
      />
      <button
        aria-label="파일철 라벨 상단 영역 높이 조절"
        className="drag-handle drag-handle-folder-top"
        onPointerDown={(event) => onResizeStart("folder-top", event)}
        title="상단 영역 높이 조절"
        type="button"
      />
      <button
        aria-label="파일철 라벨 하단 영역 높이 조절"
        className="drag-handle drag-handle-folder-footer"
        onPointerDown={(event) => onResizeStart("folder-footer", event)}
        title="하단 영역 높이 조절"
        type="button"
      />
      <button
        aria-label="파일철 라벨 전체 높이 조절"
        className="drag-handle drag-handle-height"
        onPointerDown={(event) => onResizeStart("folder-height", event)}
        title="전체 높이 조절"
        type="button"
      />
    </div>
  );
}

function LedgerCoverPage({
  colorMode,
  onColorPick,
  onResizeStart,
  onUpdate,
  resizeFeedback,
  resizing,
  settings,
}: {
  colorMode: boolean;
  onColorPick: (
    field: LedgerCoverColorField,
    color: string,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  onResizeStart: (
    kind: LedgerResizeKind,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  onUpdate: (patch: Partial<LedgerCoverSettings>) => void;
  resizeFeedback: ResizeFeedback | null;
  resizing: ResizeKind | null;
  settings: LedgerCoverSettings;
}) {
  const colorByField: Record<LedgerCoverColorField, string> = {
    pageColor: settings.pageColor,
    infoAreaColor: settings.infoAreaColor,
    titleAreaColor: settings.titleAreaColor,
    footerAreaColor: settings.footerAreaColor,
  };

  return (
    <section
      className="print-page ledger-cover-page"
      data-page-height-mm="297"
      data-page-width-mm="210"
    >
      <div
        className="ledger-cover-sheet color-pick-region"
        data-color-field="pageColor"
        data-color-mode={colorMode || undefined}
        onPointerDownCapture={(event) => {
          if (!colorMode) return;
          const region = (event.target as HTMLElement).closest<HTMLElement>(
            "[data-color-field]",
          );
          const field = region?.dataset.colorField as
            | LedgerCoverColorField
            | undefined;
          if (!region || !field || !event.currentTarget.contains(region)) return;
          onColorPick(field, colorByField[field], event);
        }}
        style={
          {
            "--ledger-page-color": settings.pageColor,
            "--ledger-info-color": settings.infoAreaColor,
            "--ledger-title-color": settings.titleAreaColor,
            "--ledger-footer-color": settings.footerAreaColor,
            "--ledger-frame-width": `${settings.frameWidthMm}mm`,
            "--ledger-frame-height": `${settings.frameHeightMm}mm`,
            "--ledger-info-width": `${settings.infoWidthMm}mm`,
            "--ledger-info-height": `${settings.infoHeightMm}mm`,
            "--ledger-title-width": `${settings.titleWidthMm}mm`,
            "--ledger-title-height": `${settings.titleHeightMm}mm`,
            "--ledger-footer-width": `${settings.footerWidthMm}mm`,
            "--ledger-footer-height": `${settings.footerHeightMm}mm`,
            "--ledger-info-font-size": `${settings.infoFontSizePt}pt`,
            "--ledger-title-font-size": `${settings.titleFontSizePt}pt`,
            "--ledger-footer-font-size": `${settings.footerFontSizePt}pt`,
          } as React.CSSProperties
        }
      >
        <div
          className="ledger-cover-frame ledger-resize-box"
          data-resizing={
            resizing === "ledger-frame-width" ||
            resizing === "ledger-frame-height"
              ? resizing
              : undefined
          }
          data-snapped={
            resizeFeedback?.kind === "ledger-frame-width" ||
            resizeFeedback?.kind === "ledger-frame-height"
              ? resizeFeedback.snapped || undefined
              : undefined
          }
        >
          <LedgerResizeHandles
            heightKind="ledger-frame-height"
            label="표지 외곽 틀"
            onResizeStart={onResizeStart}
            resizeFeedback={resizeFeedback}
            widthKind="ledger-frame-width"
          />
        </div>

        <div
          className="ledger-info-block ledger-resize-box color-pick-region"
          data-color-field="infoAreaColor"
          data-resizing={
            resizing === "ledger-info-width" ||
            resizing === "ledger-info-height"
              ? resizing
              : undefined
          }
          data-snapped={
            resizeFeedback?.kind === "ledger-info-width" ||
            resizeFeedback?.kind === "ledger-info-height"
              ? resizeFeedback.snapped || undefined
              : undefined
          }
        >
          <div className="ledger-line-row">
            <EditableText
              ariaLabel="표지 학년도"
              onCommit={(academicYear) => onUpdate({ academicYear })}
              value={settings.academicYear}
            />
          </div>
          <div className="ledger-line-row">
            <EditableText
              ariaLabel="표지 기간"
              onCommit={(periodText) => onUpdate({ periodText })}
              value={settings.periodText}
            />
          </div>
          <LedgerResizeHandles
            heightKind="ledger-info-height"
            label="상단 정보 영역"
            onResizeStart={onResizeStart}
            resizeFeedback={resizeFeedback}
            widthKind="ledger-info-width"
          />
        </div>

        <div
          className="ledger-title-block ledger-resize-box color-pick-region"
          data-color-field="titleAreaColor"
          data-resizing={
            resizing === "ledger-title-width" ||
            resizing === "ledger-title-height"
              ? resizing
              : undefined
          }
          data-snapped={
            resizeFeedback?.kind === "ledger-title-width" ||
            resizeFeedback?.kind === "ledger-title-height"
              ? resizeFeedback.snapped || undefined
              : undefined
          }
        >
          <EditableText
            ariaLabel="급여대장 또는 징수결의서 표지 제목"
            onCommit={(title) => onUpdate({ title })}
            value={settings.title}
          />
          <LedgerResizeHandles
            heightKind="ledger-title-height"
            label="표지 제목 영역"
            onResizeStart={onResizeStart}
            resizeFeedback={resizeFeedback}
            widthKind="ledger-title-width"
          />
        </div>

        <div
          className="ledger-footer-block ledger-resize-box color-pick-region"
          data-color-field="footerAreaColor"
          data-resizing={
            resizing === "ledger-footer-width" ||
            resizing === "ledger-footer-height"
              ? resizing
              : undefined
          }
          data-snapped={
            resizeFeedback?.kind === "ledger-footer-width" ||
            resizeFeedback?.kind === "ledger-footer-height"
              ? resizeFeedback.snapped || undefined
              : undefined
          }
        >
          <div className="ledger-line-row">
            <EditableText
              ariaLabel="표지 권차"
              onCommit={(volumeText) => onUpdate({ volumeText })}
              value={settings.volumeText}
            />
          </div>
          <div className="ledger-line-row ledger-agency-row">
            <EditableText
              ariaLabel="표지 관서명 문구"
              className="ledger-agency-caption"
              onCommit={(agencyCaption) => onUpdate({ agencyCaption })}
              value={settings.agencyCaption}
            />
            <EditableText
              ariaLabel="표지 관서명"
              className="ledger-agency-name"
              onCommit={(institutionName) => onUpdate({ institutionName })}
              value={settings.institutionName}
            />
          </div>
          <LedgerResizeHandles
            heightKind="ledger-footer-height"
            label="하단 정보 영역"
            onResizeStart={onResizeStart}
            resizeFeedback={resizeFeedback}
            widthKind="ledger-footer-width"
          />
        </div>
      </div>
    </section>
  );
}

function LedgerResizeHandles({
  heightKind,
  label,
  onResizeStart,
  resizeFeedback,
  widthKind,
}: {
  heightKind: LedgerResizeKind;
  label: string;
  onResizeStart: (
    kind: LedgerResizeKind,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  resizeFeedback: ResizeFeedback | null;
  widthKind: LedgerResizeKind;
}) {
  const relevantFeedback =
    resizeFeedback?.kind === widthKind || resizeFeedback?.kind === heightKind
      ? resizeFeedback
      : null;
  const placement = relevantFeedback?.kind === widthKind ? "width" : "height";

  return (
    <>
      {relevantFeedback ? (
        <output
          className={`resize-value-badge resize-value-badge-${placement}`}
          data-snapped={relevantFeedback.snapped || undefined}
        >
          {formatMeasurement(relevantFeedback.value)}mm
        </output>
      ) : null}
      <button
        aria-label={`${label} 너비 조절`}
        className="drag-handle drag-handle-width"
        onPointerDown={(event) => onResizeStart(widthKind, event)}
        title="너비 조절"
        type="button"
      />
      <button
        aria-label={`${label} 높이 조절`}
        className="drag-handle drag-handle-height"
        onPointerDown={(event) => onResizeStart(heightKind, event)}
        title="높이 조절"
        type="button"
      />
    </>
  );
}

type CoverResizeKind = Extract<
  ResizeKind,
  | "cover-title-width"
  | "cover-title-height"
  | "cover-year-width"
  | "cover-year-height"
  | "cover-institution-width"
  | "cover-institution-height"
>;

function FileFolderCoverPage({
  colorMode,
  onColorPick,
  onChange,
  onResizeStart,
  resizeFeedback,
  resizing,
  settings,
}: {
  colorMode: boolean;
  onColorPick: (
    field: FileFolderColorField,
    color: string,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  onChange: (patch: Partial<FileFolderSettings>) => void;
  onResizeStart: (
    kind: CoverResizeKind,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  resizeFeedback: ResizeFeedback | null;
  resizing: ResizeKind | null;
  settings: FileFolderSettings;
}) {
  return (
    <section
      className="print-page file-folder-page cover-page"
      data-page-height-mm="297"
      data-page-width-mm="210"
    >
      <div
        className="cover-sheet"
        style={
          {
            "--cover-box-color": settings.coverBoxColor,
          } as React.CSSProperties
        }
      >
        <CoverBox
          className="cover-box-title"
          color={settings.coverBoxColor}
          colorMode={colorMode}
          fontSizePt={settings.coverTitleFontSizePt}
          heightMm={settings.coverTitleHeightMm}
          label="앞표지 제목"
          onCommit={(coverTitle) => onChange({ coverTitle })}
          onColorPick={onColorPick}
          onResizeStart={onResizeStart}
          resizeFeedback={resizeFeedback}
          resizing={resizing}
          value={settings.coverTitle}
          widthKind="cover-title-width"
          heightKind="cover-title-height"
          widthMm={settings.coverTitleWidthMm}
        />
        <CoverBox
          className="cover-box-year"
          color={settings.coverBoxColor}
          colorMode={colorMode}
          fontSizePt={settings.coverYearFontSizePt}
          heightMm={settings.coverYearHeightMm}
          label="앞표지 연도"
          onCommit={(coverYear) => onChange({ coverYear })}
          onColorPick={onColorPick}
          onResizeStart={onResizeStart}
          resizeFeedback={resizeFeedback}
          resizing={resizing}
          value={settings.coverYear}
          widthKind="cover-year-width"
          heightKind="cover-year-height"
          widthMm={settings.coverYearWidthMm}
        />
        <CoverBox
          className="cover-box-institution"
          color={settings.coverBoxColor}
          colorMode={colorMode}
          fontSizePt={settings.coverInstitutionFontSizePt}
          heightMm={settings.coverInstitutionHeightMm}
          label="앞표지 기관명"
          onCommit={(coverInstitutionName) =>
            onChange({ coverInstitutionName })
          }
          onColorPick={onColorPick}
          onResizeStart={onResizeStart}
          resizeFeedback={resizeFeedback}
          resizing={resizing}
          value={settings.coverInstitutionName}
          widthKind="cover-institution-width"
          heightKind="cover-institution-height"
          widthMm={settings.coverInstitutionWidthMm}
        />
      </div>
    </section>
  );
}

function useEditableFont(ariaLabel: string, fontKey?: string) {
  const context = useContext(TextFontEditingContext);
  const key = context
    ? `${context.template}:${fontKey ?? ariaLabel}`
    : "";
  const fontSizePt = context?.overrides[key];

  function activate(element: HTMLElement | null) {
    if (!context || !element) return;

    const computedPx = Number.parseFloat(
      window.getComputedStyle(element).fontSize,
    );
    const computedPt = Number.isFinite(computedPx)
      ? Number((computedPx * 0.75).toFixed(1))
      : 12;
    context.activate({
      baseSizePt: clampNumber(
        fontSizePt ?? computedPt,
        TEXT_FONT_MIN_PT,
        TEXT_FONT_MAX_PT,
      ),
      key,
      label: ariaLabel,
    });
  }

  return {
    activate,
    style:
      fontSizePt === undefined
        ? undefined
        : ({ fontSize: `${fontSizePt}pt` } as React.CSSProperties),
  };
}

function CoverBox({
  className,
  color,
  colorMode,
  fontSizePt,
  heightKind,
  heightMm,
  label,
  onCommit,
  onColorPick,
  onResizeStart,
  resizeFeedback,
  resizing,
  value,
  widthKind,
  widthMm,
}: {
  className: string;
  color: string;
  colorMode: boolean;
  fontSizePt: number;
  heightKind: CoverResizeKind;
  heightMm: number;
  label: string;
  onCommit: (value: string) => void;
  onColorPick: (
    field: FileFolderColorField,
    color: string,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  onResizeStart: (
    kind: CoverResizeKind,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  resizeFeedback: ResizeFeedback | null;
  resizing: ResizeKind | null;
  value: string;
  widthKind: CoverResizeKind;
  widthMm: number;
}) {
  const relevantFeedback =
    resizeFeedback?.kind === widthKind || resizeFeedback?.kind === heightKind
      ? resizeFeedback
      : null;
  const placement = relevantFeedback?.kind === widthKind ? "width" : "height";

  return (
    <div
      className={`cover-box ${className} color-pick-region`}
      data-color-mode={colorMode || undefined}
      data-resizing={
        resizing === widthKind || resizing === heightKind ? resizing : undefined
      }
      data-snapped={relevantFeedback?.snapped || undefined}
      onPointerDownCapture={(event) =>
        onColorPick("coverBoxColor", color, event)
      }
      style={
        {
          "--cover-box-width": `${widthMm}mm`,
          "--cover-box-height": `${heightMm}mm`,
          "--cover-box-font-size": `${fontSizePt}pt`,
        } as React.CSSProperties
      }
    >
      <EditableText ariaLabel={label} onCommit={onCommit} value={value} />
      {relevantFeedback ? (
        <output
          className={`resize-value-badge resize-value-badge-${placement}`}
          data-snapped={relevantFeedback.snapped || undefined}
        >
          {formatMeasurement(relevantFeedback.value)}mm
        </output>
      ) : null}
      <button
        aria-label={`${label} 상자 너비 조절`}
        className="drag-handle drag-handle-width"
        onPointerDown={(event) => onResizeStart(widthKind, event)}
        title="상자 너비 조절"
        type="button"
      />
      <button
        aria-label={`${label} 상자 높이 조절`}
        className="drag-handle drag-handle-height"
        onPointerDown={(event) => onResizeStart(heightKind, event)}
        title="상자 높이 조절"
        type="button"
      />
    </div>
  );
}

function VerticalTitleEditor({
  ariaLabel,
  fontKey,
  gapMm = 4,
  onCommit,
  value,
}: {
  ariaLabel: string;
  fontKey?: string;
  gapMm?: number;
  onCommit: (value: string) => void;
  value: string;
}) {
  const editableFont = useEditableFont(ariaLabel, fontKey);
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const suppressBlurRef = useRef(false);
  const composingRef = useRef(false);
  const displayRef = useRef<HTMLSpanElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pointerAnchorRef = useRef<number | null>(null);
  const displayValue = editing ? draft : value;

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
  }, [editing]);

  function syncSelection(input: HTMLInputElement) {
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;
    setSelection({ start, end });
  }

  function getSelectionEndpoints(input: HTMLInputElement) {
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;
    const backward = input.selectionDirection === "backward";

    return {
      start,
      end,
      anchor: backward ? end : start,
      focus: backward ? start : end,
    };
  }

  function getCaretIndex(clientY: number) {
    const characters = Array.from(
      displayRef.current?.querySelectorAll<HTMLElement>(
        ".vertical-title-character",
      ) ?? [],
    );

    for (const [index, character] of characters.entries()) {
      const rect = character.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        return characterIndexToCodeUnitOffset(displayValue, index);
      }
    }

    return displayValue.length;
  }

  function setInputSelection(anchor: number, focus: number) {
    const input = inputRef.current;
    if (!input) return;

    const safeAnchor = clampNumber(anchor, 0, input.value.length);
    const safeFocus = clampNumber(focus, 0, input.value.length);
    const start = Math.min(safeAnchor, safeFocus);
    const end = Math.max(safeAnchor, safeFocus);
    input.setSelectionRange(
      start,
      end,
      safeAnchor <= safeFocus ? "forward" : "backward",
    );
    setSelection({ start, end });
  }

  function moveSelectionByCharacter(
    input: HTMLInputElement,
    delta: -1 | 1,
    extend: boolean,
  ) {
    const { anchor, end, focus, start } = getSelectionEndpoints(input);

    if (extend) {
      setInputSelection(anchor, focus + delta);
      return;
    }

    const nextCaret =
      start !== end ? (delta < 0 ? start : end) : focus + delta;
    setInputSelection(nextCaret, nextCaret);
  }

  function beginPointerSelection(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;

    event.preventDefault();
    editableFont.activate(event.currentTarget);
    beginEditing();
    inputRef.current?.focus({ preventScroll: true });

    const input = inputRef.current;
    const caretIndex = getCaretIndex(event.clientY);
    const anchor =
      event.shiftKey && input
        ? getSelectionEndpoints(input).anchor
        : caretIndex;
    pointerAnchorRef.current = anchor;
    setInputSelection(anchor, caretIndex);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePointerSelection(event: ReactPointerEvent<HTMLDivElement>) {
    const anchor = pointerAnchorRef.current;
    if (anchor === null) return;

    event.preventDefault();
    setInputSelection(anchor, getCaretIndex(event.clientY));
  }

  function finishPointerSelection(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerAnchorRef.current === null) return;

    pointerAnchorRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function finishEditing() {
    if (suppressBlurRef.current) return;

    pointerAnchorRef.current = null;
    setEditing(false);
    onCommit(draft.trim());
  }

  function beginEditing() {
    if (editing) return;
    setDraft(value);
    setEditing(true);
  }

  function selectAllText(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    beginEditing();
    pointerAnchorRef.current = null;

    const input = inputRef.current;
    if (!input) return;

    input.focus({ preventScroll: true });
    setInputSelection(0, input.value.length);
  }

  function commitEditing() {
    suppressBlurRef.current = true;
    pointerAnchorRef.current = null;
    setEditing(false);
    onCommit(draft.trim());
    inputRef.current?.blur();
    suppressBlurRef.current = false;
  }

  function cancelEditing() {
    suppressBlurRef.current = true;
    pointerAnchorRef.current = null;
    setDraft(value);
    setEditing(false);
    inputRef.current?.blur();
    suppressBlurRef.current = false;
  }

  const hasSelection = editing && selection.start !== selection.end;
  const displayCharacters = Array.from(displayValue);
  const selectionStartCharacter = codeUnitOffsetToCharacterIndex(
    displayValue,
    selection.start,
  );
  const selectionEndCharacter = codeUnitOffsetToCharacterIndex(
    displayValue,
    selection.end,
  );
  const caretCharacterIndex = selectionStartCharacter;

  return (
    <div
      className={`vertical-title-editor${editing ? " is-editing" : ""}`}
      onDoubleClick={selectAllText}
      onPointerCancel={finishPointerSelection}
      onPointerDown={beginPointerSelection}
      onPointerMove={movePointerSelection}
      onPointerUp={finishPointerSelection}
      ref={editorRef}
      style={editableFont.style}
    >
      <input
        aria-label={ariaLabel}
        autoComplete="off"
        className="vertical-title-input"
        onBlur={finishEditing}
        onChange={(event) => {
          setDraft(event.target.value);
          syncSelection(event.currentTarget);
        }}
        onCompositionEnd={(event) => {
          composingRef.current = false;
          setDraft(event.currentTarget.value);
          syncSelection(event.currentTarget);
        }}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onFocus={(event) => {
          beginEditing();
          editableFont.activate(editorRef.current);
          syncSelection(event.currentTarget);
        }}
        onKeyDown={(event) => {
          if (composingRef.current || event.nativeEvent.isComposing) return;

          const key = event.key.toLowerCase();
          const commandKey = event.ctrlKey || event.metaKey;

          if (commandKey && !event.altKey && key === "a") {
            event.preventDefault();
            setInputSelection(0, event.currentTarget.value.length);
            return;
          }

          if (
            !commandKey &&
            !event.altKey &&
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              event.key,
            )
          ) {
            event.preventDefault();
            const delta =
              event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
            moveSelectionByCharacter(
              event.currentTarget,
              delta,
              event.shiftKey,
            );
            return;
          }

          if (event.key === "Enter") {
            event.preventDefault();
            commitEditing();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancelEditing();
          }
        }}
        onKeyUp={(event) => syncSelection(event.currentTarget)}
        ref={inputRef}
        onSelect={(event) => syncSelection(event.currentTarget)}
        spellCheck={false}
        type="text"
        value={displayValue}
      />
      <span
        aria-hidden="true"
        className="vertical-title-display"
        ref={displayRef}
        style={{ "--vertical-gap": `${gapMm}mm` } as React.CSSProperties}
      >
        {displayCharacters.map((character, index) => (
          <span
            className="vertical-title-character-slot"
            key={`${character}-${index}`}
          >
            {editing && !hasSelection && caretCharacterIndex === index ? (
              <span
                className={`vertical-title-caret ${
                  index === 0 ? "is-start" : "is-between"
                }`}
              />
            ) : null}
            <span
              className={`vertical-title-character${
                hasSelection &&
                index >= selectionStartCharacter &&
                index < selectionEndCharacter
                  ? " is-selected"
                  : ""
              }`}
            >
              {character}
            </span>
            {editing &&
            !hasSelection &&
            caretCharacterIndex === displayCharacters.length &&
            index === displayCharacters.length - 1 ? (
              <span className="vertical-title-caret is-end" />
            ) : null}
          </span>
        ))}
        {editing && !hasSelection && displayCharacters.length === 0 ? (
          <span className="vertical-title-character-slot is-empty">
            <span className="vertical-title-caret is-start" />
          </span>
        ) : null}
      </span>
    </div>
  );
}

function characterIndexToCodeUnitOffset(value: string, index: number) {
  return Array.from(value)
    .slice(0, clampNumber(index, 0, Array.from(value).length))
    .join("").length;
}

function codeUnitOffsetToCharacterIndex(value: string, offset: number) {
  return Array.from(value.slice(0, clampNumber(offset, 0, value.length))).length;
}

function EditableText({
  ariaLabel,
  className = "",
  fontKey,
  onCommit,
  value,
}: {
  ariaLabel: string;
  className?: string;
  fontKey?: string;
  onCommit: (value: string) => void;
  value: string;
}) {
  const editableFont = useEditableFont(ariaLabel, fontKey);
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const suppressBlurRef = useRef(false);
  const composingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function finishEditing() {
    if (suppressBlurRef.current) return;
    setEditing(false);
    onCommit(draft.trim());
  }

  function beginEditing() {
    if (editing) return;
    setDraft(value);
    setEditing(true);
  }

  function commitEditing() {
    suppressBlurRef.current = true;
    setEditing(false);
    onCommit(draft.trim());
    inputRef.current?.blur();
    suppressBlurRef.current = false;
  }

  function cancelEditing() {
    suppressBlurRef.current = true;
    setDraft(value);
    setEditing(false);
    inputRef.current?.blur();
    suppressBlurRef.current = false;
  }

  const displayValue = editing ? draft : value;

  return (
    <input
      aria-label={ariaLabel}
      autoComplete="off"
      className={`direct-edit${editing ? " is-editing" : ""} ${className}`.trim()}
      onBlur={finishEditing}
      onChange={(event) => setDraft(event.target.value)}
      onClick={beginEditing}
      onCompositionEnd={(event) => {
        composingRef.current = false;
        setDraft(event.currentTarget.value);
      }}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onFocus={(event) => {
        beginEditing();
        editableFont.activate(event.currentTarget);
      }}
      onKeyDown={(event) => {
        if (composingRef.current || event.nativeEvent.isComposing) return;

        if (event.key === "Enter") {
          event.preventDefault();
          commitEditing();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          cancelEditing();
        }
      }}
      ref={inputRef}
      spellCheck={false}
      style={editableFont.style}
      type="text"
      value={displayValue}
    />
  );
}

function WrappedTextEditor({
  ariaLabel,
  fontKey,
  onCommit,
  value,
}: {
  ariaLabel: string;
  fontKey?: string;
  onCommit: (value: string) => void;
  value: string;
}) {
  const editableFont = useEditableFont(ariaLabel, fontKey);
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const suppressBlurRef = useRef(false);
  const composingRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function beginEditing() {
    if (editing) return;
    setDraft(value);
    setEditing(true);
  }

  function finishEditing() {
    if (suppressBlurRef.current) return;
    setEditing(false);
    onCommit(draft.trim());
  }

  function commitEditing() {
    suppressBlurRef.current = true;
    setEditing(false);
    onCommit(draft.trim());
    inputRef.current?.blur();
    suppressBlurRef.current = false;
  }

  function cancelEditing() {
    suppressBlurRef.current = true;
    setDraft(value);
    setEditing(false);
    inputRef.current?.blur();
    suppressBlurRef.current = false;
  }

  return (
    <textarea
      aria-label={ariaLabel}
      className={`wrapped-direct-edit${editing ? " is-editing" : ""}`}
      onBlur={finishEditing}
      onChange={(event) => setDraft(event.target.value)}
      onClick={beginEditing}
      onCompositionEnd={(event) => {
        composingRef.current = false;
        setDraft(event.currentTarget.value);
      }}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onFocus={(event) => {
        beginEditing();
        editableFont.activate(event.currentTarget);
      }}
      onKeyDown={(event) => {
        if (composingRef.current || event.nativeEvent.isComposing) return;
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          commitEditing();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          cancelEditing();
        }
      }}
      ref={inputRef}
      rows={2}
      spellCheck={false}
      style={editableFont.style}
      value={editing ? draft : value}
    />
  );
}

function NumberInput({
  ariaLabel,
  max,
  min,
  onCommit,
  step,
  unit,
  value,
}: {
  ariaLabel: string;
  max: number;
  min: number;
  onCommit: (value: number) => void;
  step: number;
  unit: string;
  value: number;
}) {
  const formattedValue = Number.isInteger(value) ? String(value) : value.toFixed(1);

  function commit(input: HTMLInputElement) {
    const parsed = Number(input.value);
    if (!Number.isFinite(parsed)) {
      input.value = formattedValue;
      return;
    }

    const stepped = Math.round(parsed / step) * step;
    const nextValue = clampNumber(Number(stepped.toFixed(2)), min, max);
    input.value = Number.isInteger(nextValue) ? String(nextValue) : nextValue.toFixed(1);
    onCommit(nextValue);
  }

  return (
    <span className="numeric-field">
      <input
        aria-label={ariaLabel}
        defaultValue={formattedValue}
        key={formattedValue}
        max={max}
        min={min}
        onBlur={(event) => commit(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.currentTarget.value = formattedValue;
            event.currentTarget.blur();
          }
        }}
        step={step}
        type="number"
      />
      <span aria-hidden="true">{unit}</span>
    </span>
  );
}
