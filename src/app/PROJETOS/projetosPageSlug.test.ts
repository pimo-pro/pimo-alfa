import { describe, expect, it } from "vitest";
import {
  buildProjetosPagePath,
  snapshotMatchesProjetosPageSlug,
  toProjetosPageSlug,
} from "./projetosPageSlug";
import type { SavedProjectRecord } from "@/core/projects/types";

describe("projetosPageSlug", () => {
  it("usa o nome do projecto como slug", () => {
    expect(toProjetosPageSlug("NP2625622")).toBe("NP2625622");
    expect(buildProjetosPagePath({ name: "NP2625622" })).toBe("/PROJETOS/NP2625622");
  });

  it("faz match por nome e não por id interno", () => {
    const record = {
      id: "pimo-abc123",
      name: "NP2625622",
    } as SavedProjectRecord;
    expect(snapshotMatchesProjetosPageSlug(record, "NP2625622")).toBe(true);
    expect(snapshotMatchesProjetosPageSlug(record, "pimo-abc123")).toBe(false);
  });

  it("reutiliza o mesmo path ao actualizar o mesmo nome", () => {
    const pathA = buildProjetosPagePath({ name: "NP2625622" });
    const pathB = buildProjetosPagePath({ name: "NP2625622" });
    expect(pathA).toBe(pathB);
  });
});
