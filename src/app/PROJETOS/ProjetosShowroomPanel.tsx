import ShowroomViewer from "@/components/showroom/ShowroomViewer";
import ShowroomViewerControls, {
  useShowroomExplodeDefaults,
} from "@/components/showroom/ShowroomViewerControls";
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
        position: "relative",
      }}
    >
      <ShowroomViewerControls
        focusLevel={focusLevel}
        boxExplode={explode.boxExplode}
        boxIntensity={explode.boxIntensity}
        pieceExplode={explode.pieceExplode}
        pieceIntensity={explode.pieceIntensity}
        onBoxExplodeChange={explode.setBoxExplode}
        onBoxIntensityChange={explode.setBoxIntensity}
        onPieceExplodeChange={explode.setPieceExplode}
        onPieceIntensityChange={explode.setPieceIntensity}
      />
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
  );
}
