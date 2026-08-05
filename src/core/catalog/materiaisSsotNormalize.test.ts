import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseMateriaisSsotWorkbook } from "./materiaisSsotReader";
import { resolveSsotChapas, propagateSsotChapaFamilies } from "./materiaisSsotNormalize";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const XLSX = path.join(ROOT, "public", "config", "materiais-ssot.xlsx");

describe("materiaisSsotNormalize + apply mapping", () => {
  it("propaga família e resolve IDs industriais existentes", async () => {
    const catalog = await parseMateriaisSsotWorkbook(fs.readFileSync(XLSX));
    const propagated = propagateSsotChapaFamilies(catalog.chapas);
    expect(propagated.some((r) => r.nomeNovoPadronizado === "MDF Branco")).toBe(true);

    const resolved = resolveSsotChapas(catalog);
    const mdf19 = resolved.find((r) => r.industrialCanonicalId === "mdf_branco-19");
    expect(mdf19?.familia).toBe("MDF Branco");
    expect(mdf19?.espessuraMm).toBe(19);

    const withIndustrial = resolved.filter((r) => r.industrialCanonicalId);
    expect(withIndustrial.length).toBeGreaterThanOrEqual(8);
  });
});
