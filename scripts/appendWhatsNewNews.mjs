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
const GITHUB_REPO = process.env.PIMO_GITHUB_REPO || "pimo-pro/pimo-criativo";

const TYPE_ICONS = {
  fix: "🛠️",
  feature: "✨",
  update: "⚙️",
  docs: "📄",
};

function run(cmd) {
  try {
    return execSync(cmd, { cwd: rootDir, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function inferType(message) {
  const m = String(message || "").trim().toLowerCase();
  // Prefixo conventional: "fix:", "feat(scope):", "chore:", "docs:", etc.
  const match = m.match(/^(fix|feat|feature|update|chore|docs)(\(|:|\b)/);
  if (!match) return "update";
  const prefix = match[1];
  if (prefix === "fix") return "fix";
  if (prefix === "feat" || prefix === "feature") return "feature";
  if (prefix === "docs") return "docs";
  // update: | chore:
  return "update";
}

function isNewsType(value) {
  return value === "fix" || value === "feature" || value === "update" || value === "docs";
}

function iconForType(type) {
  return TYPE_ICONS[isNewsType(type) ? type : "update"] || TYPE_ICONS.update;
}

function sortByPublishedAtDesc(list) {
  return [...list].sort((a, b) => {
    const tb = Date.parse(b.publishedAt) || 0;
    const ta = Date.parse(a.publishedAt) || 0;
    return tb - ta;
  });
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
  const type = isNewsType(raw.type) ? raw.type : inferType(description);
  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim()
      : shortTitle(description, version);
  const author = typeof raw.author === "string" && raw.author.trim() ? raw.author.trim() : "pimo-pro";
  const commit =
    typeof raw.commit === "string" && raw.commit.trim() ? raw.commit.trim() : undefined;
  const actionUrl =
    typeof raw.actionUrl === "string" && raw.actionUrl.trim() ? raw.actionUrl.trim() : undefined;
  const icon =
    typeof raw.icon === "string" && raw.icon.trim() ? raw.icon.trim() : iconForType(type);

  const out = { version, title, description, publishedAt, type, author, icon };
  if (commit) out.commit = commit;
  if (actionUrl) out.actionUrl = actionUrl;
  return out;
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
    // Prefer entry with richer metadata / newer publishedAt
    const prevT = Date.parse(prev.publishedAt) || 0;
    const nextT = Date.parse(entry.publishedAt) || 0;
    const prevScore =
      (prev.commit ? 1 : 0) + (prev.actionUrl ? 1 : 0) + (prev.icon ? 1 : 0);
    const nextScore =
      (entry.commit ? 1 : 0) + (entry.actionUrl ? 1 : 0) + (entry.icon ? 1 : 0);
    if (nextT > prevT || (nextT === prevT && nextScore >= prevScore)) {
      byVersion.set(entry.version, { ...prev, ...entry, icon: entry.icon || prev.icon });
    }
  }
  return sortByPublishedAtDesc([...byVersion.values()]);
}

function writeNews(file) {
  fs.mkdirSync(path.dirname(NEWS_PATH), { recursive: true });
  const payload = {
    updatedAt: new Date().toISOString(),
    news: sortByPublishedAtDesc(file.news).slice(0, MAX_ENTRIES),
  };
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  // Validate round-trip
  JSON.parse(json);
  fs.writeFileSync(NEWS_PATH, json, "utf8");
  return payload;
}

function resolveActionUrl() {
  const runId =
    process.env.GITHUB_RUN_ID ||
    process.env.DEPLOY_GITHUB_RUN_ID ||
    "";
  if (runId && /^\d+$/.test(String(runId))) {
    return `https://github.com/${GITHUB_REPO}/actions/runs/${runId}`;
  }
  // Fallback: run number alone is not enough for a valid Actions URL � omit.
  return undefined;
}

function resolveCommitHash() {
  const fromEnv =
    process.env.DEPLOY_SHA ||
    process.env.GITHUB_SHA ||
    "";
  if (fromEnv && /^[0-9a-f]{7,40}$/i.test(fromEnv)) {
    return fromEnv.slice(0, 7).toLowerCase();
  }
  const short = run("git rev-parse --short HEAD");
  return short || undefined;
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
  const type = isNewsType(process.env.DEPLOY_NEWS_TYPE)
    ? process.env.DEPLOY_NEWS_TYPE
    : inferType(commitMessage);

  const entry = {
    version: String(version).trim(),
    title: shortTitle(commitMessage, version),
    description: String(commitMessage).trim(),
    publishedAt,
    type,
    author: String(author).trim() || "pimo-pro",
    icon: iconForType(type),
  };

  const commit = resolveCommitHash();
  if (commit) entry.commit = commit;

  const actionUrl = resolveActionUrl();
  if (actionUrl) entry.actionUrl = actionUrl;

  return entry;
}

async function main() {
  const local = readLocalNews();
  const remote = await fetchRemoteNews();
  let news = mergeNews(local.news, remote);

  const entry = resolveMeta();
  if (!entry.version || entry.version === "unknown") {
    console.error("appendWhatsNewNews: versão inválida � abort.");
    process.exit(1);
  }

  // Replace same version if re-deployed, else add
  news = news.filter((n) => n.version !== entry.version);
  news.push(entry);
  news = sortByPublishedAtDesc(news);

  const written = writeNews({ news });
  console.log(
    `Whats New: ${entry.version} (${entry.type} ${entry.icon}) → ${NEWS_REL} — total ${written.news.length} registos` +
      (entry.commit ? ` commit=${entry.commit}` : "") +
      (entry.actionUrl ? ` action=${entry.actionUrl}` : "")
  );
}

const isDirectRun =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  main().catch((err) => {
    console.error("appendWhatsNewNews failed:", err);
    process.exit(1);
  });
}
