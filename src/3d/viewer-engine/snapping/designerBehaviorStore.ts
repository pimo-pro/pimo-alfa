import type {
  DesignVariantId,
  DesignerPreferences,
  EnvironmentStyleId,
  VariationKind,
} from "./intelligentDesignerTypes";

const STORAGE_KEY = "pimo.intelligentDesigner.preferences";

/**
 * Aprendizagem comportamental não-ML — ajusta pesos com base nas escolhas do utilizador.
 */
export class DesignerBehaviorStore {
  private prefs: DesignerPreferences;

  constructor() {
    this.prefs = this.load();
  }

  getPreferences(): DesignerPreferences {
    return { ...this.prefs, chosenDesignCounts: { ...this.prefs.chosenDesignCounts } };
  }

  recordDesignChoice(designId: DesignVariantId): void {
    this.prefs.chosenDesignCounts[designId] = (this.prefs.chosenDesignCounts[designId] ?? 0) + 1;
    this.prefs.lastChosenDesignId = designId;
    if (designId === "A") this.prefs.preferFlushFront = clamp01(this.prefs.preferFlushFront + 0.08);
    if (designId === "B") this.prefs.preferFreeSpace = clamp01(this.prefs.preferFreeSpace + 0.1);
    if (designId === "C") this.prefs.preferStorage = clamp01(this.prefs.preferStorage + 0.1);
    this.save();
  }

  recordVariationChoice(kind: VariationKind): void {
    this.prefs.chosenVariationCounts[kind] = (this.prefs.chosenVariationCounts[kind] ?? 0) + 1;
    switch (kind) {
      case "moreFreeSpace":
        this.prefs.preferFreeSpace = clamp01(this.prefs.preferFreeSpace + 0.12);
        break;
      case "moreStorage":
        this.prefs.preferStorage = clamp01(this.prefs.preferStorage + 0.12);
        break;
      case "moreSymmetry":
        this.prefs.preferSymmetry = clamp01(this.prefs.preferSymmetry + 0.12);
        break;
      case "moreDepth":
        this.prefs.preferFlushFront = clamp01(this.prefs.preferFlushFront - 0.05);
        break;
    }
    this.save();
  }

  recordRefinement(): void {
    this.prefs.preferFlushFront = clamp01(this.prefs.preferFlushFront + 0.04);
    this.save();
  }

  learnStylePreference(styleId: EnvironmentStyleId): void {
    this.prefs.chosenStyleCounts[styleId] = (this.prefs.chosenStyleCounts[styleId] ?? 0) + 1;
    this.prefs.preferredStyleId = styleId;
    if (styleId === "minimalist" || styleId === "nordic" || styleId === "scandinavian") {
      this.prefs.preferFreeSpace = clamp01(this.prefs.preferFreeSpace + 0.1);
    }
    if (styleId === "industrial" || styleId === "luxury") {
      this.prefs.preferStorage = clamp01(this.prefs.preferStorage + 0.08);
      this.prefs.preferTallModules = clamp01(this.prefs.preferTallModules + 0.06);
    }
    if (styleId === "japandi" || styleId === "classic") {
      this.prefs.preferSymmetry = clamp01(this.prefs.preferSymmetry + 0.1);
    }
    if (styleId === "modern") {
      this.prefs.preferFlushFront = clamp01(this.prefs.preferFlushFront + 0.08);
    }
    this.save();
  }

  applyLearnedWeights(): string {
    const p = this.prefs;
    const lines: string[] = [
      `Design preferido: ${p.lastChosenDesignId ?? "—"}`,
      `Flush frontal: ${Math.round(p.preferFlushFront * 100)}%`,
      `Espaço livre: ${Math.round(p.preferFreeSpace * 100)}%`,
      `Armazenamento: ${Math.round(p.preferStorage * 100)}%`,
      `Simetria: ${Math.round(p.preferSymmetry * 100)}%`,
      `Escolhas A/B/C: ${p.chosenDesignCounts.A}/${p.chosenDesignCounts.B}/${p.chosenDesignCounts.C}`,
      `Estilo preferido: ${p.preferredStyleId ?? "—"}`,
    ];
    return lines.join("\n");
  }

  reset(): void {
    this.prefs = {
      preferFlushFront: 0.5,
      preferTallModules: 0.5,
      preferSymmetry: 0.5,
      preferStorage: 0.5,
      preferFreeSpace: 0.5,
      chosenDesignCounts: { A: 0, B: 0, C: 0 },
      chosenVariationCounts: {},
      chosenStyleCounts: {},
      lastChosenDesignId: null,
      preferredStyleId: null,
    };
    this.save();
  }

  private load(): DesignerPreferences {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultPrefs();
      const parsed = JSON.parse(raw) as Partial<DesignerPreferences>;
      return {
        ...defaultPrefs(),
        ...parsed,
        chosenDesignCounts: { ...defaultPrefs().chosenDesignCounts, ...parsed.chosenDesignCounts },
        chosenStyleCounts: { ...defaultPrefs().chosenStyleCounts, ...parsed.chosenStyleCounts },
      };
    } catch {
      return defaultPrefs();
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.prefs));
    } catch {
      void 0;
    }
  }
}

function defaultPrefs(): DesignerPreferences {
  return {
    preferFlushFront: 0.5,
    preferTallModules: 0.5,
    preferSymmetry: 0.5,
    preferStorage: 0.5,
    preferFreeSpace: 0.5,
    chosenDesignCounts: { A: 0, B: 0, C: 0 },
    chosenVariationCounts: {},
    chosenStyleCounts: {},
    lastChosenDesignId: null,
    preferredStyleId: null,
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
