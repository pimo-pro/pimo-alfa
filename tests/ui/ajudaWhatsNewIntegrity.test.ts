import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseReleasePublicationsFile,
} from "../../src/industrial/release/loadReleasePublications";
import { RELEASE_PUBLICATIONS_URL } from "../../src/industrial/release/releaseNotesTypes";

const rootDir = path.resolve(import.meta.dirname, "../..");
const publicationsPath = path.join(rootDir, "public/industrial/release/publications.json");
const helpPagePath = path.join(rootDir, "src/pages/HelpPage.tsx");
const whatsNewPagePath = path.join(rootDir, "src/pages/ajuda/AjudaWhatsNewPage.tsx");
const ajudaPagePath = path.join(rootDir, "src/pages/ajuda/AjudaPage.tsx");
const ajudaRoutesPath = path.join(rootDir, "src/routes/ajudaRoutes.tsx");

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

  it("carrega JSON de publicacoes corretamente", () => {
    expect(RELEASE_PUBLICATIONS_URL).toBe("/industrial/release/publications.json");
    expect(fs.existsSync(publicationsPath)).toBe(true);

    const raw = fs.readFileSync(publicationsPath, "utf8");
    const data = JSON.parse(raw.replace(/^\uFEFF/, ""));
    const publications = parseReleasePublicationsFile(data);

    expect(publications.length).toBeGreaterThan(0);
    expect(publications[0]?.version).toMatch(/^v\d+\.\d{4}\.\d{4}$/);
    expect(publications[0]?.publishedAt).toBeTruthy();
    expect(publications[0]?.commitMessage).toBeTruthy();
    expect(publications[0]?.author).toBeTruthy();
  });

  it("pagina whats-new exibe ultima versao publicada", () => {
    const raw = fs.readFileSync(publicationsPath, "utf8");
    const publications = parseReleasePublicationsFile(JSON.parse(raw.replace(/^\uFEFF/, "")));
    const latest = publications[0];

    const pageSource = fs.readFileSync(whatsNewPagePath, "utf8");
    expect(pageSource).toContain("Novidades do Sistema");
    expect(pageSource).toContain("loadReleasePublications");
    expect(pageSource).toContain("commitMessage");

    expect(latest?.version).toBeTruthy();
    expect(latest?.commitMessage.length).toBeGreaterThan(0);
  });
});
