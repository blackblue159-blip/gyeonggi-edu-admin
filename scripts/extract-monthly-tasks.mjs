import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TITLE_ORDER = ["매월 반복 업무", "수시 업무", "수시 업무 안내", "민원 — 수시 업무"];
const TITLE_SET = new Set(TITLE_ORDER);

function mergeChildren(existing, chunk) {
  if (!Array.isArray(chunk)) return existing;
  for (const line of chunk) {
    const s = String(line);
    if (!existing.includes(s)) existing.push(s);
  }
  return existing;
}

function transform(task) {
  const buckets = Object.fromEntries(TITLE_ORDER.map((t) => [t, []]));

  const months = task.months ?? {};
  const nextMonths = {};

  for (let m = 1; m <= 12; m++) {
    const key = String(m);
    const arr = Array.isArray(months[key]) ? months[key] : [];
    const kept = [];
    for (const item of arr) {
      const title = item?.title;
      if (title != null && TITLE_SET.has(String(title))) {
        mergeChildren(buckets[String(title)], item.children);
      } else {
        kept.push(item);
      }
    }
    nextMonths[key] = kept;
  }

  const monthly = TITLE_ORDER.filter((t) => buckets[t].length > 0).map((t) => ({
    title: t,
    children: buckets[t],
  }));

  return {
    id: task.id,
    label: task.label,
    icon: task.icon,
    monthly,
    months: nextMonths,
  };
}

const tasksDir = path.join(__dirname, "..", "src", "data", "tasks");
const files = fs.readdirSync(tasksDir).filter((f) => f.endsWith(".json"));

for (const file of files) {
  const fp = path.join(tasksDir, file);
  const raw = fs.readFileSync(fp, "utf8");
  const data = JSON.parse(raw);
  const out = transform(data);
  fs.writeFileSync(fp, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log("updated:", file);
}
