import type { V4Piece, V4Placement } from "../../nesting-v4/nestingV4Types";

const font = "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const muted = "var(--text-muted,#94a3b8)";
const text = "var(--text-main,#e2e8f0)";

type Props = {
  piece: V4Piece | null;
  placement: V4Placement | null;
};

export default function LcaPiecePanel({ piece, placement }: Props) {
  if (!piece) {
    return (
      <div style={{ padding: 12, fontFamily: font, color: muted, fontSize: 12 }}>
        Seleccione uma peça para ver os detalhes.
      </div>
    );
  }

  const rot90 = piece.rotation === 90 || piece.rotation === 270;
  const w = rot90 ? piece.heightMm : piece.widthMm;
  const h = rot90 ? piece.widthMm : piece.heightMm;
  const holeTypes = Array.from(
    new Set(piece.originalHoles.map((h) => h.holeType || "furo").filter(Boolean))
  );
  const qrPayload = `PIMO|${piece.id}|${piece.name}|${w}x${h}x${piece.thicknessMm}`;

  const rows: Array<[string, string]> = [
    ["Nome", piece.name],
    ["Dimensões", `${w} × ${h} × ${piece.thicknessMm} mm`],
    ["Rotação", `${piece.rotation}°`],
    ["Grain", piece.industrialGrainCode ?? (piece.lockWoodGrain ? "YY (lock)" : "—")],
    ["Nº furos", String(piece.originalHoles.length)],
    ["Tipos de furos", holeTypes.length ? holeTypes.join(", ") : "—"],
    [
      "Distâncias",
      placement
        ? `X ${placement.xMm.toFixed(1)} · Y ${placement.yMm.toFixed(1)} mm`
        : "Não colocada",
    ],
    ["Material", piece.materialName || piece.materialId || "—"],
    ["Espessura", `${piece.thicknessMm} mm`],
    ["Grupo espessura", `E${piece.thicknessMm}`],
    ["ID industrial", piece.id],
    ["Tipo", piece.pieceTipo || "—"],
    ["QR (visual)", qrPayload.slice(0, 42) + (qrPayload.length > 42 ? "…" : "")],
  ];

  return (
    <div style={{ padding: "10px 12px", fontFamily: font, overflowY: "auto", height: "100%" }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: muted,
          marginBottom: 10,
        }}
      >
        Peça seleccionada
      </div>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 8,
          background: "#0f172a",
          border: "1px solid rgba(255,255,255,0.12)",
          display: "grid",
          placeItems: "center",
          marginBottom: 12,
          fontSize: 9,
          color: muted,
          textAlign: "center",
          padding: 4,
        }}
        title={qrPayload}
      >
        QR visual
        <br />
        <span style={{ color: text, fontSize: 8 }}>{piece.id.slice(0, 10)}</span>
      </div>
      <dl style={{ margin: 0, display: "grid", gap: 8 }}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt style={{ fontSize: 9, color: muted, marginBottom: 2 }}>{label}</dt>
            <dd style={{ margin: 0, fontSize: 12, color: text, wordBreak: "break-word" }}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
