/**
 * Append Whats New entry to public/updates/news.json (deploy / publish).
 * Preserves existing entries; never deletes history (cap MAX_ENTRIES).
 * Optionally merges remote production file before append (CI).
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const NEWS_REL = path.join("public", "updates", "news.json");
const NEWS_PATH = path.join(rootDir, NEWS_REL);
const MAX_ENTRIES = 300;
const PROD_NEWS_URL = process.env.PIMO_NEWS_URL || "https://pimo.pro/updates/news.json";

function run(cmd) {
  try {
    return execSync(cmd, { cwd: rootDir, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function inferType(message) {
  const m = String(message || "").trim().toLowerCase();
  if (m.startsWith("fix")) return "fix";
  if (m.startsWith("feat") || m.startsWith("feature")) return "feature";
  return "update";
}

function shortTitle(message, version) {
  const line = String(message || "")
    .trim()
    .split(/\r?\n/)[0]
    .trim();
  if (!line) return `Publicação ${version}`;
  return line.length > 90 ? `${line.slice(0, 87)}...` : line;
}

function emptyFile() {
  return { updatedAt: new Date().toISOString(), news: [] };
}

function isHtmlPayload(text) {
  const t = String(text || "").trim().toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html");
}

function normalizeEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const version = typeof raw.version === "string" ? raw.version.trim() : "";
  if (!version) return null;
  const description =
    typeof raw.description === "string"
      ? raw.description
      : typeof raw.commitMessage === "string"
        ? raw.commitMessage
        : "";
  const publishedAt =
    typeof raw.publishedAt === "string" && raw.publishedAt
      ? raw.publishedAt
      : new Date().toISOString();
  const type =
    raw.type === "fix" || raw.type === "feature" || raw.type === "update"
      ? raw.type
      : inferType(description);
  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim()
      : shortTitle(description, version);
  const author = typeof raw.author === "string" && raw.author.trim() ? raw.author.trim() : "pimo-pro";
  return { version, title, description, publishedAt, type, author };
}

function readLocalNews() {
  try {
    if (!fs.existsSync(NEWS_PATH)) return emptyFile();
    const raw = fs.readFileSync(NEWS_PATH, "utf8").replace(/^\uFEFF/, "");
    if (isHtmlPayload(raw)) return emptyFile();
    const data = JSON.parse(raw);
    const list = Array.isArray(data.news)
      ? data.news
      : Array.isArray(data.publications)
        ? data.publications
        : [];
    return {
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
      news: list.map(normalizeEntry).filter(Boolean),
    };
  } catch {
    return emptyFile();
  }
}

async function fetchRemoteNews() {
  if (process.env.PIMO_NEWS_SKIP_REMOTE === "1") return null;
  try {
    const res = await fetch(PROD_NEWS_URL, {
      headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (isHtmlPayload(text)) return null;
    const data = JSON.parse(text);
    const list = Array.isArray(data.news)
      ? data.news
      : Array.isArray(data.publications)
        ? data.publications
        : [];
    return list.map(normalizeEntry).filter(Boolean);
  } catch {
    return null;
  }
}

function mergeNews(localList, remoteList) {
  const byVersion = new Map();
  for (const entry of [...(remoteList || []), ...(localList || [])]) {
    if (!entry?.version) continue;
    const prev = byVersion.get(entry.version);
    if (!prev) {
      byVersion.set(entry.version, entry);
      continue;
    }
    // Keep the richer / newer publishedAt
    const prevT = Date.parse(prev.publishedAt) || 0;
    const nextT = Date.parse(entry.publishedAt) || 0;
    if (nextT >= prevT) byVersion.set(entry.version, entry);
  }
  return [...byVersion.values()].sort((a, b) => {
    const tb = Date.parse(b.publishedAt) || 0;
    const ta = Date.parse(a.publishedAt) || 0;
    return tb - ta;
  });
}

function writeNews(file) {
  fs.mkdirSync(path.dirname(NEWS_PATH), { recursive: true });
  const payload = {
    updatedAt: new Date().toISOString(),
    news: file.news.slice(0, MAX_ENTRIES),
  };
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  // Validate round-trip
  JSON.parse(json);
  fs.writeFileSync(NEWS_PATH, json, "utf8");
  return payload;
}

function resolveMeta() {
  const version =
    process.env.DEPLOY_VERSION ||
    process.env.GITHUB_REF_NAME ||
    (() => {
      try {
        const v = JSON.parse(fs.readFileSync(path.join(rootDir, "version.json"), "utf8"));
        return v.version || "";
      } catch {
        return "";
      }
    })() ||
    run("git describe --tags --exact-match HEAD 2>nul") ||
    "unknown";

  const commitMessage =
    process.env.DEPLOY_COMMIT_MESSAGE ||
    run("git log -1 --format=%s") ||
    `Publicação ${version}`;

  const author = process.env.DEPLOY_AUTHOR || run("git log -1 --format=%an") || "pimo-pro";
  const publishedAt = process.env.DEPLOY_PUBLISHED_AT || new Date().toISOString();
  const type =
    process.env.DEPLOY_NEWS_TYPE === "fix" ||
    process.env.DEPLOY_NEWS_TYPE === "feature" ||
    process.env.DEPLOY_NEWS_TYPE === "update"
      ? process.env.DEPLOY_NEWS_TYPE
      : inferType(commitMessage);

  return {
    version: String(version).trim(),
    title: shortTitle(commitMessage, version),
    description: String(commitMessage).trim(),
    publishedAt,
    type,
    author: String(author).trim() || "pimo-pro",
  };
}

async function main() {
  const local = readLocalNews();
  const remote = await fetchRemoteNews();
  let news = mergeNews(local.news, remote);

  const entry = resolveMeta();
  if (!entry.version || entry.version === "unknown") {
    console.error("appendWhatsNewNews: versão inválida — abort.");
    process.exit(1);
  }

  // Replace same version if re-deployed, else prepend
  news = news.filter((n) => n.version !== entry.version);
  news.unshift(entry);

  const written = writeNews({ news });
  console.log(
    `Whats New: ${entry.version} (${entry.type}) ? ${NEWS_REL} — total ${written.news.length} registos`
  );
}

main().catch((err) => {
  console.error("appendWhatsNewNews failed:", err);
  process.exit(1);
});
