import type { DrillExportFile } from "../drill/drillExport";
import type {
  CutListItem,
  CutListItemComPreco,
  ViewerDrillMarkersByPanel,
} from "../types";
import type { IndustrialDesignBox } from "./types";

export type CustomIndustrialModelMetadata = {
  designWorkspace: boolean;
  tipo: "industrial-designer";
  sourceBoxId?: string;
  panelCount: number;
  holeCount: number;
  espessuraMm: number;
  materialId: string;
  createdAt: string;
  cutlistItemCount: number;
  txmlFileCount: number;
  moduleKind?: string;
  /** Categoria no catálogo Móveis (`base` | `upper` | `corner`). */
  categoriaCatalogo?: "base" | "upper" | "corner" | "gavetas";
  /** Número de gavetas no módulo (gavetas industriais). */
  drawerCount?: number;
  /** Lado da frente fixa em módulos de canto. */
  cornerSide?: "left" | "right";
};

export type CustomIndustrialModelRecord = {
  id: string;
  nome: string;
  tipo: "industrial-designer";
  designWorkspace: boolean;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  designBox: IndustrialDesignBox;
  cutlist: CutListItem[];
  cutlistComPreco: CutListItemComPreco[];
  drillExportFiles: DrillExportFile[];
  viewerMarkers: ViewerDrillMarkersByPanel;
  metadata: CustomIndustrialModelMetadata;
};
