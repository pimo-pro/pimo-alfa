import { listOfficialMaterials } from "../core/materials/materials.api";
export function buildMaterialsApiPayload() {
    const materials = listOfficialMaterials().map((m) => ({
        id: m.canonicalId,
        label: m.label,
        espessura: Number(m.industrialDefaults?.espessuraPadrao) || 18,
        precoPorM2: Number(m.industrialDefaults?.custo_m2) || 0,
        sheetWidthMm: m.industrialDefaults?.larguraChapa,
        sheetHeightMm: m.industrialDefaults?.alturaChapa,
        type: "wood",
        industrial: m.industrial,
        visual: m.visual,
        aliases: m.aliases.map((a) => a.name),
        action: m.action,
        source: "industrial-default",
    }));
    return {
        ok: true,
        count: materials.length,
        materials,
        updatedAt: new Date().toISOString(),
    };
}
