import type { ProjetosFocusLevel } from "@/app/PROJETOS/ProjetosShowroomPanel";
import { IconSepararCaixas } from "@/components/icons/viewer/IconSepararCaixas";
import { IconExplodirPecas } from "@/components/icons/viewer/IconExplodirPecas";

type Props = {
  focusLevel: ProjetosFocusLevel;
  boxExplode: boolean;
  pieceExplode: boolean;
  onBoxExplodeToggle: () => void;
  onPieceExplodeToggle: () => void;
};

export function ShowroomViewerTopBar({
  focusLevel,
  boxExplode,
  pieceExplode,
  onBoxExplodeToggle,
  onPieceExplodeToggle,
}: Props) {
  const showBoxBtn = focusLevel === "project" || focusLevel === "box";
  const showPieceBtn = focusLevel === "box" || focusLevel === "piece";

  if (!showBoxBtn && !showPieceBtn) return null;

  return (
    <div style={barStyle}>
      {showBoxBtn && (
        <button
          type="button"
          title={boxExplode ? "Reunir caixas" : "Separar caixas"}
          onClick={onBoxExplodeToggle}
          style={btnStyle(boxExplode)}
        >
          <IconSepararCaixas size={18} color={boxExplode ? "#fff" : "#52525b"} />
          <span style={labelStyle}>{boxExplode ? "Reunir caixas" : "Separar caixas"}</span>
        </button>
      )}
      {showPieceBtn && (
        <button
          type="button"
          title={pieceExplode ? "Reunir peças" : "Separar peças"}
          onClick={onPieceExplodeToggle}
          style={btnStyle(pieceExplode)}
        >
          <IconExplodirPecas size={18} color={pieceExplode ? "#fff" : "#52525b"} />
          <span style={labelStyle}>{pieceExplode ? "Reunir peças" : "Separar peças"}</span>
        </button>
      )}
    </div>
  );
}

const barStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  background: "rgba(255,255,255,0.96)",
  borderBottom: "1px solid #e4e4e7",
  flexShrink: 0,
};

function btnStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 10px",
    borderRadius: 6,
    border: `1px solid ${active ? "#3f3f46" : "#d4d4d8"}`,
    background: active ? "#3f3f46" : "#fff",
    cursor: "pointer",
    fontSize: 12,
    color: active ? "#fff" : "#52525b",
    transition: "all 0.15s",
  };
}

const labelStyle: React.CSSProperties = {
  lineHeight: 1,
};
