import fs from "fs";
import path from "path";

const base = "src/admin/rules";

const modules = {
  snapRules: {
    defaults: { captureRadiusMm: 45, magnetStrength: 0.85, gridSizeMm: 50, flushToleranceMm: 2, snapPriorityBox: 100, snapPriorityRemate: 80, snapPriorityRodape: 70, autoBalanceEnabled: true, predictiveSnapEnabled: true },
    sections: { "Snap unificado": ["captureRadiusMm", "magnetStrength", "gridSizeMm", "flushToleranceMm"], Prioridades: ["snapPriorityBox", "snapPriorityRemate", "snapPriorityRodape"], Comportamento: ["autoBalanceEnabled", "predictiveSnapEnabled"] },
  },
  roomRules: {
    defaults: { wallOffsetMm: 50, openingSnapMarginMm: 120, cornerSnapEnabled: true, stackSnapEnabled: true, depthAlignToleranceMm: 3, heightAlignToleranceMm: 3 },
    sections: { "Room Snap": ["wallOffsetMm", "openingSnapMarginMm", "cornerSnapEnabled", "stackSnapEnabled"], Tolerancias: ["depthAlignToleranceMm", "heightAlignToleranceMm"] },
  },
  autoFillRules: {
    defaults: { minModuleWidthMm: 300, maxModulesPerWall: 12, equalGapsDefault: true, alignTopDefault: true, alignFrontDefault: true, roomFillMaxModules: 20, wallFillGapMm: 0 },
    sections: { "Auto-Wall-Fill": ["minModuleWidthMm", "maxModulesPerWall", "wallFillGapMm"], "Auto-Room-Fill": ["roomFillMaxModules"], Alinhamento: ["equalGapsDefault", "alignTopDefault", "alignFrontDefault"] },
  },
  designerRules: {
    defaults: { designAModuleBias: 1, designBSpaceBias: 0.75, designCStorageBias: 1.25, minErgonomicsScore: 60, variationCount: 4, learnPreferencesWeight: 0.5 },
    sections: { "Design A/B/C": ["designAModuleBias", "designBSpaceBias", "designCStorageBias"], Aprendizagem: ["minErgonomicsScore", "variationCount", "learnPreferencesWeight"] },
  },
  styleRules: {
    defaults: { styleMatchMinScore: 65, flushFrontDefault: 0.8, continuityDefault: true, learnStyleEnabled: true, maxStyleModules: 10 },
    sections: { Estilos: ["styleMatchMinScore", "flushFrontDefault", "continuityDefault", "learnStyleEnabled", "maxStyleModules"] },
  },
  conversationRules: {
    defaults: { minIntentConfidence: 0.75, maxHistoryEntries: 50, enableCostIntents: true, enableManufacturingIntents: true, enableStyleIntents: true },
    sections: { Conversacao: ["minIntentConfidence", "maxHistoryEntries"], Intencoes: ["enableCostIntents", "enableManufacturingIntents", "enableStyleIntents"] },
  },
  ergonomicsRules: {
    defaults: { baseCabinetHeightMm: 720, workTriangleMinMm: 1200, workTriangleMaxMm: 2600, doorClearanceMm: 600, drawerClearanceMm: 450, wallModuleGapMinMm: 50 },
    sections: { Ergonomia: ["baseCabinetHeightMm", "workTriangleMinMm", "workTriangleMaxMm", "doorClearanceMm", "drawerClearanceMm", "wallModuleGapMinMm"] },
  },
  manufacturingRules: {
    defaults: { standardBaseHeightMm: 720, standardUpperHeightMm: 720, heightToleranceMm: 15, depthMinMm: 500, depthMaxMm: 650, depthInconsistencyMm: 30, rodapeGapMaxMm: 1, doorClearanceMinMm: 3, drawerClearanceMinMm: 2, openingMarginMm: 120, moduleMinGapMm: 2, remateOffsetWarnMm: 2 },
    sections: { Alturas: ["standardBaseHeightMm", "standardUpperHeightMm", "heightToleranceMm"], Profundidades: ["depthMinMm", "depthMaxMm", "depthInconsistencyMm"], Folgas: ["rodapeGapMaxMm", "doorClearanceMinMm", "drawerClearanceMinMm", "openingMarginMm", "moduleMinGapMm", "remateOffsetWarnMm"] },
  },
  variationRules: {
    defaults: { moreFreeSpaceSpread: 1.15, moreStorageCloneFactor: 1, moreSymmetryMirror: 1, moreDepthNudgeMm: 80, variationPreviewEnabled: true },
    sections: { Variacoes: ["moreFreeSpaceSpread", "moreStorageCloneFactor", "moreSymmetryMirror", "moreDepthNudgeMm", "variationPreviewEnabled"] },
  },
  predictiveRules: {
    defaults: { maxDesignPreviews: 8, overlayGuideOpacity: 0.85, autoRefineOnAccept: true, rejectClearsOverlay: true },
    sections: { "Layout Preditivo": ["maxDesignPreviews", "overlayGuideOpacity", "autoRefineOnAccept", "rejectClearsOverlay"] },
  },
  distributionRules: {
    defaults: { minGapMm: 2, useHistorySpacing: true, alignTop: true, alignFront: true, alignDepth: true, distributeEvenly: true },
    sections: { Distribuicao: ["minGapMm", "useHistorySpacing", "alignTop", "alignFront", "alignDepth", "distributeEvenly"] },
  },
  shelfRules: {
    defaults: { defaultShelfCount: 3, topMarginMm: 40, bottomMarginMm: 40, minShelfGapMm: 80, maxShelvesPerBox: 8 },
    sections: { Prateleiras: ["defaultShelfCount", "topMarginMm", "bottomMarginMm", "minShelfGapMm", "maxShelvesPerBox"] },
  },
  layoutRules: {
    defaults: { primaryWallPriority: 1, secondaryWallPriority: 0.7, maxModulesPerRow: 8, roomInsetMm: 0, preferSymmetry: true },
    sections: { "Layout Profiles": ["primaryWallPriority", "secondaryWallPriority", "maxModulesPerRow", "roomInsetMm", "preferSymmetry"] },
  },
  scoringRules: {
    defaults: { ergonomicsWeight: 0.33, costWeight: 0.33, manufacturingWeight: 0.34, productionReadyMinScore: 85, economyMinScore: 75, styleMatchWeight: 0.2 },
    sections: { Pontuacao: ["ergonomicsWeight", "costWeight", "manufacturingWeight", "productionReadyMinScore", "economyMinScore", "styleMatchWeight"] },
  },
};

function pascal(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function label(k) {
  return k
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/ Mm$/, " (mm)")
    .replace(/ Enabled$/, " ativo");
}

for (const [name, cfg] of Object.entries(modules)) {
  const dir = path.join(base, name);
  fs.mkdirSync(dir, { recursive: true });
  const typeName = pascal(name.replace(/Rules$/, "")) + "Rules";
  const storeName = name + "Store";
  const dc = name.replace(/([A-Z])/g, "_$1").toUpperCase() + "_DEFAULTS";
  const keys = Object.keys(cfg.defaults);
  const fields = [];
  for (const [section, skeys] of Object.entries(cfg.sections)) {
    for (const k of skeys) {
      const t = typeof cfg.defaults[k] === "boolean" ? "boolean" : "number";
      const step = t === "number" && cfg.defaults[k] < 2 ? 0.01 : 1;
      fields.push({ key: k, label: label(k), type: t, section, min: t === "number" ? 0 : undefined, step: t === "number" ? step : undefined });
    }
  }

  const typeBody = keys.map((k) => `  ${k}: ${typeof cfg.defaults[k] === "boolean" ? "boolean" : "number"};`).join("\n");
  fs.writeFileSync(path.join(dir, "rulesDefaults.ts"), `export type ${typeName} = {\n${typeBody}\n};\n\nexport const ${dc}: ${typeName} = ${JSON.stringify(cfg.defaults, null, 2)};\n`);

  const fieldsTs = fields
    .map((f) => {
      let line = `  { key: "${f.key}", label: "${f.label}", type: "${f.type}", section: "${f.section}"`;
      if (f.min != null) line += `, min: ${f.min}`;
      if (f.step != null) line += `, step: ${f.step}`;
      return line + " },";
    })
    .join("\n");
  fs.writeFileSync(
    path.join(dir, "rulesSchema.ts"),
    `import type { RulesFieldDef } from "../shared/types";\nimport type { ${typeName} } from "./rulesDefaults";\n\nexport const ${name.toUpperCase()}_FIELDS: RulesFieldDef[] = [\n${fieldsTs}\n];\n\nexport type { ${typeName} };\n`
  );

  fs.writeFileSync(
    path.join(dir, "rulesStore.ts"),
    `import { createRulesStore } from "../shared/createRulesStore";\nimport { ${dc}, type ${typeName} } from "./rulesDefaults";\n\nexport const ${storeName} = createRulesStore<${typeName}>("${name}", ${dc});\n`
  );

  const editorTitle = name.replace(/Rules$/, "").replace(/([A-Z])/g, " $1").trim();
  fs.writeFileSync(
    path.join(dir, "rulesEditor.tsx"),
    `import { GenericRulesEditor } from "../shared/GenericRulesEditor";\nimport { ${name.toUpperCase()}_FIELDS } from "./rulesSchema";\nimport { ${storeName} } from "./rulesStore";\n\nexport function ${pascal(name)}Editor() {\n  return (\n    <GenericRulesEditor\n      title="Regras de ${editorTitle}"\n      subtitle="Parâmetros configuráveis do motor ${editorTitle}."\n      fields={${name.toUpperCase()}_FIELDS}\n      store={${storeName}}\n    />\n  );\n}\n`
  );
}

console.log("generated", Object.keys(modules).length, "modules");
