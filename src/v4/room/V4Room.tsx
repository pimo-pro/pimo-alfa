import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import { V4RoomFloor } from "./V4RoomFloor";
import { V4RoomWall } from "./V4RoomWall";
import type { V4RoomConfig } from "./V4RoomConfig";

interface V4RoomProps {
  config: V4RoomConfig;
}

/**
 * Sala com 4 paredes + teto + chão. Paredes ocultam-se dinamicamente conforme
 * a posição da câmera: se a câmera está do lado de fora de uma parede,
 * essa parede fica opacity=0 para não bloquear a vista do interior.
 *
 * Coordenadas (metros):
 *   centro do chão = (0, 0, 0)
 *   parede traseira = Z negativo
 *   parede frontal  = Z positivo
 *   parede esquerda = X negativo
 *   parede direita  = X positivo
 */
export function V4Room({ config }: V4RoomProps) {
  const w = config.width  / 1000;
  const d = config.depth  / 1000;
  const h = config.height / 1000;
  const halfW = w / 2;
  const halfD = d / 2;
  const halfH = h / 2;

  const [opacityFront,   setOpacityFront]   = useState(1);
  const [opacityBack,    setOpacityBack]    = useState(1);
  const [opacityLeft,    setOpacityLeft]    = useState(1);
  const [opacityRight,   setOpacityRight]   = useState(1);
  const [opacityCeiling, setOpacityCeiling] = useState(1);

  useFrame(({ camera }) => {
    const camX = camera.position.x;
    const camY = camera.position.y;
    const camZ = camera.position.z;

    setOpacityFront(camZ >  halfD * 0.5 ? 0 : 1);
    setOpacityBack( camZ < -halfD * 0.5 ? 0 : 1);
    setOpacityRight(camX >  halfW * 0.5 ? 0 : 1);
    setOpacityLeft( camX < -halfW * 0.5 ? 0 : 1);

    const aboveCeiling = camY > h * 0.8;
    setOpacityCeiling(!config.showCeiling || aboveCeiling ? 0 : 1);
  });

  return (
    <group>
      {/* Chão */}
      <V4RoomFloor config={config} />

      {/* Parede traseira — Z negativo */}
      <V4RoomWall
        position={[0, halfH, -halfD]}
        rotation={[0, 0, 0]}
        width={w}
        height={h}
        color={config.wallColor}
        opacity={opacityBack}
      />

      {/* Parede frontal — Z positivo */}
      <V4RoomWall
        position={[0, halfH, halfD]}
        rotation={[0, Math.PI, 0]}
        width={w}
        height={h}
        color={config.wallColor}
        opacity={opacityFront}
      />

      {/* Parede lateral esquerda — X negativo */}
      <V4RoomWall
        position={[-halfW, halfH, 0]}
        rotation={[0, Math.PI / 2, 0]}
        width={d}
        height={h}
        color={config.wallColor}
        opacity={opacityLeft}
      />

      {/* Parede lateral direita — X positivo */}
      <V4RoomWall
        position={[halfW, halfH, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        width={d}
        height={h}
        color={config.wallColor}
        opacity={opacityRight}
      />

      {/* Teto — Y = height */}
      <V4RoomWall
        position={[0, h, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        width={w}
        height={d}
        color={config.wallColor}
        opacity={opacityCeiling}
      />
    </group>
  );
}
