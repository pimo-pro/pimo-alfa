import ShowroomViewer from "@/components/showroom/ShowroomViewer";
import type { SavedProjectRecord } from "@/core/projects/types";

export type ProjetosFocusLevel = "project" | "box" | "piece";

type ProjetosShowroomPanelProps = {
  snapshot: SavedProjectRecord | null;
  focusLevel: ProjetosFocusLevel;
  projectPageSlug: string | undefined;
  boxId: string | undefined;
  pieceId: string | undefined;
};

export default function ProjetosShowroomPanel({
  snapshot,
  focusLevel,
  projectPageSlug,
  boxId,
  pieceId,
}: ProjetosShowroomPanelProps) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", height: "100%" }}>
      <ShowroomViewer
        snapshot={snapshot}
        mode={focusLevel}
        projectId={projectPageSlug}
        boxId={boxId}
        pieceId={pieceId}
        readOnly
      />
    </div>
  );
}
