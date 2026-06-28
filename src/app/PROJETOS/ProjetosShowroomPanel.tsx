import ShowroomViewer from "@/components/showroom/ShowroomViewer";
import { useShowroomExplodeDefaults } from "@/components/showroom/ShowroomViewerControls";
import { ShowroomViewerTopBar } from "@/components/showroom/ShowroomViewerTopBar";
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
  const explode = useShowroomExplodeDefaults(focusLevel);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <ShowroomViewerTopBar
        focusLevel={focusLevel}
        boxExplode={explode.boxExplode}
        pieceExplode={explode.pieceExplode}
        onBoxExplodeToggle={() => explode.setBoxExplode(!explode.boxExplode)}
        onPieceExplodeToggle={() => explode.setPieceExplode(!explode.pieceExplode)}
      />
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <ShowroomViewer
          snapshot={snapshot}
          mode={focusLevel}
          projectId={projectPageSlug}
          boxId={boxId}
          pieceId={pieceId}
          readOnly
          boxExplode={explode.boxExplode}
          boxIntensity={explode.boxIntensity}
          pieceExplode={explode.pieceExplode}
          pieceIntensity={explode.pieceIntensity}
        />
      </div>
    </div>
  );
}
