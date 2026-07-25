import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseWhatsNewFile,
  WHATS_NEW_NEWS_URL,
} from "../../src/pages/ajuda/loadWhatsNewNews";

const rootDir = path.resolve(import.meta.dirname, "../..");
const newsPath = path.join(rootDir, "public/updates/news.json");
const helpPagePath = path.join(rootDir, "src/pages/HelpPage.tsx");
const whatsNewPagePath = path.join(rootDir, "src/pages/ajuda/AjudaWhatsNewPage.tsx");
const ajudaPagePath = path.join(rootDir, "src/pages/ajuda/AjudaPage.tsx");
const ajudaRoutesPath = path.join(rootDir, "src/routes/ajudaRoutes.tsx");
const appendScriptPath = path.join(rootDir, "scripts/appendWhatsNewNews.mjs");
const deployYmlPath = path.join(rootDir, ".github/workflows/deploy.yml");

describe("ajudaWhatsNewIntegrity", () => {
  it("declara rota /ajuda/whats-new sem erro", () => {
    const routesSource = fs.readFileSync(ajudaRoutesPath, "utf8");
    expect(routesSource).toContain('export const AJUDA_PATH = "/ajuda"');
    expect(routesSource).toContain('export const AJUDA_WHATS_NEW_PATH = "/ajuda/whats-new"');
    expect(routesSource).toContain("AjudaWhatsNewPage");
    expect(fs.existsSync(ajudaPagePath)).toBe(true);
    expect(fs.existsSync(whatsNewPagePath)).toBe(true);
  });

  it("menu Conteudo contem item Novidades do Sistema", () => {
    const source = fs.readFileSync(helpPagePath, "utf8");
    expect(source).toContain("Novidades do Sistema");
    expect(source).toContain("AJUDA_WHATS_NEW_PATH");
    expect(source).toContain("Conteúdo");
  });

  it("carrega JSON de novidades (/updates/news.json) corretamente", () => {
    expect(WHATS_NEW_NEWS_URL).toBe("/updates/news.json");
    expect(fs.existsSync(newsPath)).toBe(true);
    expect(fs.existsSync(appendScriptPath)).toBe(true);

    const raw = fs.readFileSync(newsPath, "utf8");
    expect(raw.trim().toLowerCase().startsWith("<!doctype")).toBe(false);
    const data = JSON.parse(raw.replace(/^\uFEFF/, ""));
    const news = parseWhatsNewFile(data);

    expect(news.length).toBeGreaterThan(0);
    expect(news[0]?.version).toMatch(/^v\d+\./);
    expect(news[0]?.publishedAt).toBeTruthy();
    expect(news[0]?.title).toBeTruthy();
    expect(news[0]?.description).toBeTruthy();
    expect(["fix", "update", "feature", "docs"]).toContain(news[0]?.type);
  });

  it("infere type a partir do prefixo do commit", async () => {
    const { inferWhatsNewType } = await import("../../src/pages/ajuda/loadWhatsNewNews");
    expect(inferWhatsNewType("fix: corrige news.json")).toBe("fix");
    expect(inferWhatsNewType("fix(ajuda): restaurar Novidades")).toBe("fix");
    expect(inferWhatsNewType("feat: nova secção")).toBe("feature");
    expect(inferWhatsNewType("feature: algo")).toBe("feature");
    expect(inferWhatsNewType("chore: limpeza")).toBe("update");
    expect(inferWhatsNewType("update: texto")).toBe("update");
    expect(inferWhatsNewType("docs: atualizar ajuda")).toBe("docs");
    expect(inferWhatsNewType("Publicação PIMO")).toBe("update");
  });

  it("deploy.yml append news.json antes do build", () => {
    const yml = fs.readFileSync(deployYmlPath, "utf8");
    expect(yml).toContain("appendWhatsNewNews.mjs");
    expect(yml).toContain("Append Whats New news.json");
  });

  it("pagina whats-new usa loadWhatsNewNews", () => {
    const pageSource = fs.readFileSync(whatsNewPagePath, "utf8");
    expect(pageSource).toContain("Novidades do Sistema");
    expect(pageSource).toContain("loadWhatsNewNews");
    expect(pageSource).toContain("entry.title");
    expect(pageSource).toContain("entry.icon");
    expect(pageSource).toContain("entry.actionUrl");
  });

  it("script append inclui actionUrl, commit, icon e ordenacao", () => {
    const src = fs.readFileSync(appendScriptPath, "utf8");
    expect(src).toContain("GITHUB_RUN_ID");
    expect(src).toContain("actionUrl");
    expect(src).toContain("git rev-parse --short HEAD");
    expect(src).toContain("sortByPublishedAtDesc");
    expect(src).toContain("🛠️");
    expect(src).toContain("✨");
    expect(src).toContain("⚙️");
    expect(src).toContain("📄");
  });

  it("iconForWhatsNewType mapeia tipos", async () => {
    const { iconForWhatsNewType } = await import("../../src/pages/ajuda/loadWhatsNewNews");
    expect(iconForWhatsNewType("fix")).toBe("🛠️");
    expect(iconForWhatsNewType("feature")).toBe("✨");
    expect(iconForWhatsNewType("update")).toBe("⚙️");
    expect(iconForWhatsNewType("docs")).toBe("📄");
  });
});
