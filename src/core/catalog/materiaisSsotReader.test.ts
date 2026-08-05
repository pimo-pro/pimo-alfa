import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseMateriaisSsotWorkbook,
  resolveChapaNomePadronizado,
} from "./materiaisSsotReader";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const XLSX = path.join(ROOT, "public", "config", "materiais-ssot.xlsx");

describe("materiaisSsotReader", () => {
  it("lê o Excel SSOT inicial (Chapas / Freeagens / Orla)", async () => {
    expect(fs.existsSync(XLSX)).toBe(true);
    const buf = fs.readFileSync(XLSX);
    const catalog = await parseMateriaisSsotWorkbook(buf, XLSX);
    expect(catalog.chapas.length).toBeGreaterThanOrEqual(20);
    expect(catalog.freeagens.length).toBeGreaterThanOrEqual(10);
    expect(catalog.orla.length).toBeGreaterThanOrEqual(3);

    const mdf = catalog.chapas.find((c) => c.ref === "mdf_branco-19");
    expect(mdf).toBeTruthy();
    expect(mdf!.nomeAtual).toContain("MDF Branco");
    expect(mdf!.espessuraMm).toBe(19);
    expect(mdf!.nomeNovoPadronizado).toBe("MDF Branco");
    expect(resolveChapaNomePadronizado(mdf!)).toBe("MDF Branco");

    const orla = catalog.orla.find((o) => o.ref === "branco_pvc_08_23mm");
    expect(orla?.precoPorMetroEur).toBeGreaterThan(0);
  });
});
