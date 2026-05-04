import { useMemo, useState } from "react";
import { ALL_TASKS } from "../data/tasks/index.js";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const TEXT_PRIMARY = "#37352f";
const TEXT_SECONDARY = "#787774";
const TEXT_MUTED = "#9b9a97";
const BORDER_DEFAULT = "1px solid #e9e9e7";
const SELECT_BORDER = "1.5px solid #1D9E75";
const SELECT_BG = "#E1F5EE";
const HOVER_BG = "#f7f6f3";
const WARNING_COLOR = "#854F0B";
const CHILD_BORDER = "1.5px solid #d3d3d0";
const TITLE_BOX_BG = "#f7f6f3";
const DOT_GREEN = "#1D9E75";

function currentMonthNumber() {
  return new Date().getMonth() + 1;
}

function isWarningLine(text) {
  return String(text ?? "").trimStart().startsWith("⚠️");
}

export default function TaskGuide() {
  const [selectedId, setSelectedId] = useState(() => ALL_TASKS[0]?.id ?? "");
  const [hoveredTaskId, setHoveredTaskId] = useState(null);

  const selectedTask = useMemo(
    () => ALL_TASKS.find((t) => t.id === selectedId) ?? ALL_TASKS[0],
    [selectedId],
  );

  const currentMonth = currentMonthNumber();

  if (!selectedTask || ALL_TASKS.length === 0) {
    return (
      <main
        style={{
          margin: "0 auto",
          width: "100%",
          maxWidth: 960,
          flex: 1,
          padding: "40px 20px 56px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <p style={{ fontSize: 14, color: TEXT_SECONDARY }}>등록된 업무 데이터가 없습니다.</p>
      </main>
    );
  }

  return (
    <main
      style={{
        margin: "0 auto",
        width: "100%",
        maxWidth: 960,
        flex: 1,
        padding: "40px 20px 56px",
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        color: TEXT_PRIMARY,
      }}
    >
      <header style={{ marginBottom: 28 }}>
        <div
          role="status"
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 8,
            background: "#FFFBEB",
            border: "1px solid #FDE68A",
            boxSizing: "border-box",
          }}
        >
          <span
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.02em",
              color: "#9A3412",
            }}
          >
            미완성 · 수정중
          </span>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 13,
              lineHeight: 1.55,
              color: "#78350F",
            }}
          >
            월별 업무 데이터와 안내 문구는 아직 완성 단계가 아니며, 예고 없이 바뀔 수 있습니다. 참고용으로
            이용해 주세요.
          </p>
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: TEXT_PRIMARY,
          }}
        >
          업무별 월간 가이드
        </h1>
        <p
          style={{
            margin: "12px 0 0",
            maxWidth: 560,
            fontSize: 15,
            lineHeight: 1.6,
            color: TEXT_SECONDARY,
          }}
        >
          급여·지출·세입 등 업무별로 월마다 챙길 일을 정리해 두었습니다. JSON 파일을 편집해 내용을
          채워 넣을 수 있습니다.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gridTemplateRows: "repeat(2, auto)",
          gap: 14,
          marginBottom: 32,
        }}
      >
        {ALL_TASKS.map((task) => {
          const selected = task.id === selectedTask.id;
          const hovered = hoveredTaskId === task.id && !selected;
          return (
            <button
              key={task.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setSelectedId(task.id)}
              onMouseEnter={() => setHoveredTaskId(task.id)}
              onMouseLeave={() => setHoveredTaskId(null)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                minHeight: 72,
                padding: "12px 8px",
                cursor: "pointer",
                borderRadius: 10,
                border: selected ? SELECT_BORDER : BORDER_DEFAULT,
                background: selected ? SELECT_BG : hovered ? HOVER_BG : "#fff",
                boxSizing: "border-box",
                textAlign: "center",
                font: "inherit",
                color: TEXT_PRIMARY,
                transition: "background 0.15s ease, border-color 0.15s ease",
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden>
                {task.icon}
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>{task.label}</span>
            </button>
          );
        })}
      </div>

      <hr
        style={{
          border: "none",
          borderTop: "1px solid #e9e9e7",
          margin: "0 0 28px",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden>
          {selectedTask.icon}
        </span>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: TEXT_PRIMARY }}>
          {selectedTask.label}
        </h2>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}
      >
        {MONTHS.map((month) => {
          const items = selectedTask.months[String(month)] ?? [];
          const isThisMonth = month === currentMonth;

          return (
            <section
              key={month}
              aria-label={`${month}월`}
              style={{
                border: isThisMonth ? SELECT_BORDER : BORDER_DEFAULT,
                borderRadius: 10,
                background: "#fff",
                padding: 14,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY }}>
                  {month}월
                </h3>
                {isThisMonth ? (
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#0F6E56",
                      background: "#E1F5EE",
                      borderRadius: 20,
                      whiteSpace: "nowrap",
                    }}
                  >
                    이번 달
                  </span>
                ) : null}
              </div>

              {items.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5 }}>
                  등록된 업무가 없습니다
                </p>
              ) : (
                <div>
                  {items.map((group, gIdx) => (
                    <div
                      key={`${month}-g-${gIdx}`}
                      style={{ marginBottom: gIdx < items.length - 1 ? 16 : 0 }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: 8,
                          background: TITLE_BOX_BG,
                          marginBottom: 8,
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            marginTop: 5,
                            flexShrink: 0,
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: DOT_GREEN,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: TEXT_PRIMARY,
                            lineHeight: 1.45,
                          }}
                        >
                          {group.title}
                        </span>
                      </div>
                      {Array.isArray(group.children) && group.children.length > 0 ? (
                        <div
                          style={{
                            marginLeft: 4,
                            paddingLeft: 12,
                            borderLeft: CHILD_BORDER,
                          }}
                        >
                          {group.children.map((child, cIdx) => (
                            <p
                              key={cIdx}
                              style={{
                                margin: cIdx > 0 ? "6px 0 0" : 0,
                                fontSize: 11,
                                lineHeight: 1.55,
                                color: isWarningLine(child) ? WARNING_COLOR : TEXT_SECONDARY,
                              }}
                            >
                              {child}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
