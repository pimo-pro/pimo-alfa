import { describe, it, expect } from "vitest";
import { DEFAULT_LABEL_CONFIG } from "../labelConfig/labelConfig";
import { buildDefaultLabelSystemV5, LABEL_SYSTEM_V5_SCHEMA_VERSION } from "../labelSystem/LabelSystemV5";
import { resolveLabelSystemConfig } from "../labelSystem/resolveLabelSystemConfig";
import { computeV5LabelLayout, V5_LAYOUT_PAD_MM, V5_LAYOUT_QR_GAP_BELOW_MM } from "./labelLayoutV5";
import type { RulesConfig } from "../rules/rulesConfig";

describe("DEFAULT_LABEL_CONFIG — dimensões físicas v5", () => {
  it("usa exactamente 100×50 mm com faixa inferior de 10 mm", () => {
    const d = DEFAULT_LABEL_CONFIG.dimensions;
    expect(d.totalWidth_mm).toBe(100);
    expect(d.totalHeight_mm).toBe(50);
    expect(d.bottomStrip_mm).toBe(10);
    expect(d.qrSize_mm).toBe(30);
  });
});

describe("computeV5LabelLayout", () => {
  const dims = DEFAULT_LABEL_CONFIG.dimensions;

  it("secção superior = 40 mm e faixa inferior = 10 mm dentro dos 50 mm", () => {
    const layout = computeV5LabelLayout(dims);
    expect(layout.pageW).toBe(100);
    expect(layout.pageH).toBe(50);
    expect(layout.bottomStripMm).toBe(10);
    expect(layout.topSectionMm).toBe(40);
    expect(layout.bottomY).toBe(40);
    expect(layout.maxY).toBe(50);
  });

  it("QR 30×30 mm cabe na secção superior sem overflow", () => {
    const layout = computeV5LabelLayout(dims);
    expect(layout.qrSizeMm).toBe(30);

    const qrBottom = V5_LAYOUT_PAD_MM + layout.qrSizeMm;
    expect(qrBottom).toBeLessThanOrEqual(layout.topSectionMm);

    const obsBottom =
      V5_LAYOUT_PAD_MM + layout.qrSizeMm + V5_LAYOUT_QR_GAP_BELOW_MM + 3.5;
    expect(obsBottom).toBeLessThanOrEqual(layout.cutY);
  });

  it("grelha de produção termina antes da linha de observações", () => {
    const layout = computeV5LabelLayout(dims);
    const yGrid = V5_LAYOUT_PAD_MM + dims.materialHeight_mm + dims.medidasHeight_mm;
    expect(yGrid + layout.gridH).toBeCloseTo(layout.obsY, 5);
    expect(layout.obsY).toBeLessThan(layout.cutY);
    expect(layout.bottomY + layout.bottomStripMm).toBeCloseTo(layout.pageH, 5);
  });
});

describe("resolveLabelSystemConfig — migração v1→v2", () => {
  it("corrige perfis legados 98×60 para 100×50 mm", () => {
    const legacy = buildDefaultLabelSystemV5();
    legacy.schemaVersion = 1;
    legacy.dimensions.widthMm = 98;
    legacy.dimensions.heightMm = 60;

    const rules = { labelSystemV5: legacy } as RulesConfig;
    const runtime = resolveLabelSystemConfig(rules, null, legacy);

    expect(runtime.schemaVersion).toBe(LABEL_SYSTEM_V5_SCHEMA_VERSION);
    expect(runtime.labelConfig.dimensions.totalWidth_mm).toBe(100);
    expect(runtime.labelConfig.dimensions.totalHeight_mm).toBe(50);
  });
});
