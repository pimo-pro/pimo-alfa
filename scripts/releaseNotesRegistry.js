// pimo-kep-fix-001 — protegido, não modificar sem autorização

import fs from "node:fs";
import path from "node:path";

const KEP_ID = "pimo-kep-fix-001";
const MAX_ENTRIES = 200;

export function getReleaseNotesFilePath(rootDir) {
  return path.join(rootDir, "public", "industrial", "release", "publications.json");
}

function readRegistry(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { _pimoKep: KEP_ID, publications: [] };
    }
    const data = JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
    if (!Array.isArray(data.publications)) {
      return { _pimoKep: KEP_ID, publications: [] };
    }
    return data;
  } catch {
    return { _pimoKep: KEP_ID, publications: [] };
  }
}

export function capturePrePublishCommitInfo(runOutput) {
  return {
    author: runOutput("git log -1 --format=%an") || "desconhecido",
    commitMessage: runOutput("git log -1 --format=%s") || "",
  };
}

export function appendPublicationEntry(rootDir, entry) {
  const filePath = getReleaseNotesFilePath(rootDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const registry = readRegistry(filePath);
  registry._pimoKep = KEP_ID;
  registry.publications.unshift({
    publishedAt: entry.publishedAt,
    author: entry.author,
    commitMessage: entry.commitMessage,
    version: entry.version,
  });
  registry.publications = registry.publications.slice(0, MAX_ENTRIES);
  fs.writeFileSync(filePath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  console.log(`Release notes: entrada registada (${entry.version}) em public/industrial/release/publications.json`);
}
