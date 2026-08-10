/**
 * Canvas CNC 3D — chapa, peças, furos e trajetória TCN real (Three.js / R3F).
 */

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Line } from "@react-three/drei";
import type { Group } from "three";
import type { V4Piece, V4Placement, V4Sheet } from "../../nesting-v4/nestingV4Types";
import type { LcaTcnRules } from "../rules/layoutCorteAlfaTcnRules";
import type { ParsedTcnPanel } from "../engines/parseTcnMoPaths";

export type Cnc3dProps = {
  sheet: V4Sheet;
  pieces: V4Piece[];
  placements: V4Placement[];
  parsedPanel: ParsedTcnPanel | null;
  simulationOn: boolean;
  simSpeed: number;
  tcnRules: LcaTcnRules;
  selectedId: string | null;
};

function mmToM(v: number) {
  return v / 1000;
}

function SheetMesh({ sheet }: { sheet: V4Sheet }) {
  const w = mmToM(sheet.widthMm);
  const h = mmToM(sheet.heightMm);
  const t = mmToM(Math.max(sheet.thicknessMm, 8));
  return (
    <mesh position={[w / 2, -t / 2, h / 2]} receiveShadow>
      <boxGeometry args={[w, t, h]} />
      <meshStandardMaterial color="#3d4a5c" roughness={0.85} metalness={0.05} />
    </mesh>
  );
}

function PieceMeshes({
  sheet,
  pieces,
  placements,
  selectedId,
}: {
  sheet: V4Sheet;
  pieces: V4Piece[];
  placements: V4Placement[];
  selectedId: string | null;
}) {
  return (
    <>
      {placements
        .filter((p) => p.sheetIndex === sheet.index)
        .map((pl) => {
          const piece = pieces.find((pc) => pc.id === pl.pieceId);
          if (!piece) return null;
          const rot90 = piece.rotation === 90 || piece.rotation === 270;
          const w = mmToM(rot90 ? piece.heightMm : piece.widthMm);
          const d = mmToM(rot90 ? piece.widthMm : piece.heightMm);
          const t = mmToM(piece.thicknessMm);
          const x = mmToM(pl.xMm) + w / 2;
          const z = mmToM(pl.yMm) + d / 2;
          const selected = selectedId === piece.id;
          return (
            <group key={piece.id}>
              <mesh position={[x, t / 2 + 0.0005, z]} castShadow>
                <boxGeometry args={[w, t, d]} />
                <meshStandardMaterial
                  color={selected ? "#60a5fa" : piece.color || "#c4a574"}
                  roughness={0.7}
                />
              </mesh>
              {piece.originalHoles.map((hole, i) => {
                const hx = mmToM(pl.xMm + (rot90 ? hole.y : hole.x));
                const hz = mmToM(pl.yMm + (rot90 ? hole.x : hole.y));
                const r = mmToM(Math.max(hole.diameter / 2, 1.5));
                const depth = mmToM(Math.min(hole.depth || 12, piece.thicknessMm));
                return (
                  <mesh key={i} position={[hx, t - depth / 2 + 0.001, hz]} rotation={[-Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[r, r, depth, 16]} />
                    <meshStandardMaterial color="#0f172a" />
                  </mesh>
                );
              })}
            </group>
          );
        })}
    </>
  );
}

function ToolpathAndTool({
  sheet,
  parsedPanel,
  simulationOn,
  simSpeed,
  tcnRules,
}: {
  sheet: V4Sheet;
  parsedPanel: ParsedTcnPanel | null;
  simulationOn: boolean;
  simSpeed: number;
  tcnRules: LcaTcnRules;
}) {
  const toolRef = useRef<Group>(null);
  const progress = useRef(0);

  const points3d = useMemo(() => {
    const pts = parsedPanel?.points ?? [];
    // TCN Y (máquina BL) → Z Three; flip Y canvas→ máquina já no parser overlay 2D;
    // aqui: x→X, y máquina → Z scene, z TCN → Y scene (altura)
    return pts.map((p) => [mmToM(p.x), mmToM(Math.max(p.z, -sheet.thicknessMm)), mmToM(sheet.heightMm - p.y)] as [number, number, number]);
  }, [parsedPanel, sheet.heightMm, sheet.thicknessMm]);

  useFrame((_, delta) => {
    if (!simulationOn || points3d.length === 0) return;
    progress.current += delta * simSpeed * tcnRules.display.simulationSpeed * 0.35;
    if (progress.current >= 1) progress.current = 0;
    const idx = Math.min(points3d.length - 1, Math.floor(progress.current * points3d.length));
    const p = points3d[idx];
    if (p && toolRef.current) {
      toolRef.current.position.set(p[0], p[1] + 0.02, p[2]);
    }
  });

  const visible = simulationOn
    ? points3d.slice(0, Math.max(2, Math.ceil(progress.current * points3d.length)))
    : points3d;

  return (
    <>
      {visible.length > 1 && (
        <Line
          points={visible}
          color={tcnRules.display.pathColor}
          lineWidth={tcnRules.display.lineWidthPx}
        />
      )}
      <group ref={toolRef}>
        <mesh>
          <cylinderGeometry args={[0.006, 0.006, 0.04, 12]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
    </>
  );
}

export default function Cnc3dCanvas(props: Cnc3dProps) {
  const { sheet, pieces, placements, parsedPanel, simulationOn, simSpeed, tcnRules, selectedId } = props;
  const w = mmToM(sheet.widthMm);
  const h = mmToM(sheet.heightMm);

  return (
    <div style={{ flex: 1, minHeight: 0, background: "#020617" }}>
      <Canvas shadows camera={{ position: [w * 1.2, 0.9, h * 1.2], fov: 45 }} style={{ width: "100%", height: "100%" }}>
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[2, 4, 2]} intensity={1.1} castShadow />
        <SheetMesh sheet={sheet} />
        <PieceMeshes sheet={sheet} pieces={pieces} placements={placements} selectedId={selectedId} />
        <ToolpathAndTool
          sheet={sheet}
          parsedPanel={parsedPanel}
          simulationOn={simulationOn}
          simSpeed={simSpeed}
          tcnRules={tcnRules}
        />
        <Grid
          args={[Math.max(w, h) * 2, Math.max(w, h) * 2]}
          cellSize={0.1}
          sectionSize={0.5}
          position={[w / 2, 0, h / 2]}
          infiniteGrid={false}
        />
        <OrbitControls makeDefault target={[w / 2, 0, h / 2]} />
      </Canvas>
      <div
        style={{
          position: "absolute",
          left: 10,
          bottom: 10,
          fontSize: 10,
          color: "#94a3b8",
          background: "rgba(15,23,42,0.8)",
          padding: "6px 8px",
          borderRadius: 6,
        }}
      >
        3D · TCN Real (mo) · {parsedPanel?.points.length ?? 0} pts · órbita com rato
      </div>
    </div>
  );
}
