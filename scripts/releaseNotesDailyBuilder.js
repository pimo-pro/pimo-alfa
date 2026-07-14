// pimo-kep-fix-004 — protegido, não modificar sem autorização

import fs from "node:fs";
import path from "node:path";
import { getReleaseNotesFilePath } from "./releaseNotesRegistry.js";

const MS_24H = 24 * 60 * 60 * 1000;

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatDateLocal(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

const rootDir = process.cwd();
const publicationsPath = getReleaseNotesFilePath(rootDir);
const dailyPath = path.join(rootDir, "public", "industrial", "release", "daily.json");

let publications = [];
try {
  if (fs.existsSync(publicationsPath)) {
    const data = JSON.parse(fs.readFileSync(publicationsPath, "utf8").replace(/^\uFEFF/, ""));
    publications = Array.isArray(data.publications) ? data.publications : [];
  }
} catch {
  publications = [];
}

const cutoff = Date.now() - MS_24H;
const entries = publications.filter((entry) => {
  const timestamp = Date.parse(entry.publishedAt);
  return Number.isFinite(timestamp) && timestamp >= cutoff;
});

const daily = {
  date: formatDateLocal(new Date()),
  entries,
};

fs.mkdirSync(path.dirname(dailyPath), { recursive: true });
fs.writeFileSync(dailyPath, `${JSON.stringify(daily, null, 2)}\n`, "utf8");
console.log(
  `Release notes diarias: ${entries.length} entrada(s) escritas em public/industrial/release/daily.json`,
);
