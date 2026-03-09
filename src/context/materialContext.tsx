import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { safeGetItem, safeParseJson, safeSetItem } from "../utils/storage";
import type { MaterialCategory } from "./materialUtils";
import { getPresetById } from "../core/materials/presetService";
import type { MaterialCategoryConfig, MaterialSystemState, ModelPart } from "./materialUtils";
import { MATERIAL_STORAGE_KEY, normalizeMaterialState } from "./materialUtils";
import { MaterialContext } from "./materialContextInstance";

export function MaterialProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MaterialSystemState>(() => {
    const stored = safeParseJson<unknown>(safeGetItem(MATERIAL_STORAGE_KEY));
    return normalizeMaterialState(stored);
  });

  useEffect(() => {
    safeSetItem(MATERIAL_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setCategoryPreset = useCallback((category: MaterialCategory, presetId: string) => {
    const preset = getPresetById(presetId);
    setState((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: {
          ...prev.categories[category],
          presetId,
          ...(preset
            ? {
                roughness: preset.roughness ?? prev.categories[category].roughness,
                metalness: preset.metallic ?? prev.categories[category].metalness,
                color: preset.color ?? prev.categories[category].color,
              }
            : {}),
        },
      },
    }));
  }, []);

  const setCategoryOverrides = useCallback(
    (category: MaterialCategory, overrides: Partial<MaterialCategoryConfig>) => {
      setState((prev) => ({
        ...prev,
        categories: {
          ...prev.categories,
          [category]: {
            ...prev.categories[category],
            ...overrides,
          },
        },
      }));
    },
    []
  );

  const setAssignment = useCallback((part: ModelPart, category: MaterialCategory) => {
    setState((prev) => ({
      ...prev,
      assignments: {
        ...prev.assignments,
        [part]: category,
      },
    }));
  }, []);

  const value = useMemo(
    () => ({
      state,
      setCategoryPreset,
      setCategoryOverrides,
      setAssignment,
    }),
    [state, setCategoryPreset, setCategoryOverrides, setAssignment]
  );

  return <MaterialContext.Provider value={value}>{children}</MaterialContext.Provider>;
}
