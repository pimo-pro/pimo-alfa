import { createContext } from "react";
import type { MaterialSystemState } from "./materialUtils";
import type { MaterialCategory } from "./materialUtils";
import type { MaterialCategoryConfig, ModelPart } from "./materialUtils";

type MaterialContextValue = {
  state: MaterialSystemState;
  setCategoryPreset: (_category: MaterialCategory, _presetId: string) => void;
  setCategoryOverrides: (
    _category: MaterialCategory,
    _overrides: Partial<MaterialCategoryConfig>
  ) => void;
  setAssignment: (_part: ModelPart, _category: MaterialCategory) => void;
};

export const MaterialContext = createContext<MaterialContextValue | null>(null);
