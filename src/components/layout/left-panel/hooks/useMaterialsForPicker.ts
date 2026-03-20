import { useEffect, useState } from "react";
import {
  defaultIndustrialMaterials,
  fallbackMaterialsFromLocalStorage,
  normalizeApiMaterial,
  type MaterialOption,
} from "../materialOptions";

export function useMaterialsForPicker() {
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [materialsList, setMaterialsList] = useState<MaterialOption[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);

  useEffect(() => {
    if (!materialModalOpen) return;
    let active = true;

    const loadMaterials = async () => {
      setMaterialsLoading(true);

      // 1) API real (online)
      try {
        const response = await fetch("/api/materials", { method: "GET" });
        if (response.ok) {
          const payload = (await response.json()) as unknown;
          const rows = payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).materials)
            ? ((payload as Record<string, unknown>).materials as unknown[])
            : Array.isArray(payload)
              ? payload
              : [];
          const normalized = rows.map((row) => normalizeApiMaterial(row)).filter((row): row is MaterialOption => Boolean(row));
          if (normalized.length > 0) {
            if (active) setMaterialsList(normalized);
            if (active) setMaterialsLoading(false);
            return;
          }
        }
      } catch {
        // fallback abaixo
      }

      // 2) localStorage
      const fromLocalStorage = fallbackMaterialsFromLocalStorage();
      if (fromLocalStorage.length > 0) {
        if (active) setMaterialsList(fromLocalStorage);
        if (active) setMaterialsLoading(false);
        return;
      }

      // 3) defaults industriais
      if (active) setMaterialsList(defaultIndustrialMaterials());
      if (active) setMaterialsLoading(false);
    };

    void loadMaterials();
    return () => {
      active = false;
    };
  }, [materialModalOpen]);

  return {
    materialModalOpen,
    setMaterialModalOpen,
    materialsList,
    materialsLoading,
  };
}

export type UseMaterialsForPickerResult = ReturnType<typeof useMaterialsForPicker>;
