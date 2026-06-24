import { describe, expect, it } from "vitest";
import {
  normalizeViewerMaterialQuality,
  resolveMaterialModeForQuality,
} from "./materialQualityMode";

describe("materialQualityMode", () => {
  it("mapeia premium para showcase e restantes para realistic", () => {
    expect(resolveMaterialModeForQuality("premium")).toBe("showcase");
    expect(resolveMaterialModeForQuality("lacquered")).toBe("realistic");
    expect(resolveMaterialModeForQuality("standard")).toBe("realistic");
  });

  it("normaliza qualidade desconhecida para standard", () => {
    expect(normalizeViewerMaterialQuality("premium")).toBe("premium");
    expect(normalizeViewerMaterialQuality("lacquered")).toBe("lacquered");
    expect(normalizeViewerMaterialQuality("standard")).toBe("standard");
    expect(normalizeViewerMaterialQuality("unknown" as never)).toBe("standard");
  });
});
