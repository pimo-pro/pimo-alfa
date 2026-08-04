import { describe, expect, it } from "vitest";
import { backupLayerMaterials, restoreLayerMaterials } from "../core/viewer/materialPreservation";
import type { DoorLayerItem, DrawerLayerItem } from "../models/BoxLayers";

describe("materialPreservation — frentes gaveta", () => {
  it("restaura materialId/material e metadata.frontMaterial após regeneração", () => {
    const drawersBefore: DrawerLayerItem[] = [
      {
        id: "d1",
        material: "carvalho-20",
        materialId: "carvalho-20",
        metadata: { frontMaterial: "carvalho-20" },
      } as DrawerLayerItem,
    ];
    const backup = backupLayerMaterials({
      material: "mdf_branco-19",
      doorsLayer: [],
      drawersLayer: drawersBefore,
    });

    const generatedDrawers: DrawerLayerItem[] = [
      {
        id: "d1-new",
        material: "mdf_branco-19",
        materialId: "mdf_branco-19",
      } as DrawerLayerItem,
    ];

    const restored = restoreLayerMaterials(
      { doorsLayer: [] as DoorLayerItem[], drawersLayer: generatedDrawers },
      backup
    );

    expect(restored.drawersLayer[0]?.materialId).toBe("carvalho-20");
    expect(restored.drawersLayer[0]?.material).toBe("carvalho-20");
    expect(restored.drawersLayer[0]?.metadata?.frontMaterial).toBe("carvalho-20");
    expect(restored.drawersLayer[0]?.id).toBe("d1");
  });
});
