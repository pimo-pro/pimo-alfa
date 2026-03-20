/**
 * MaterialEngine — Tipos centralizados.
 * Modos: performance (só cor), showcase (cor + textura + normalMap), realistic (igual showcase, extensível).
 */

import type * as THREE from "three";

/** Modo de renderização de materiais. */
export type MaterialMode = "performance" | "showcase" | "realistic";

/** Preset normalizado para o MaterialEngine (viewerMaterialId como chave). */
export interface MaterialPresetDefinition {
  id: string;
  name: string;
  baseColor: string;
  textureUrl?: string;
  normalMapUrl?: string;
  roughnessMapUrl?: string;
  roughness: number;
  metalness: number;
  envMapIntensity?: number;
  /** Escala UV (repeat). */
  repeat?: { x: number; y: number };
  /** Rotação UV em graus. */
  rotation?: number;
}

/** Opções de construção de material (ex.: lacado com clearcoat físico). */
export type BuildMaterialOptions = {
  /** Quando true, usa MeshPhysicalMaterial com clearcoat (qualidade "lacado" no viewer). */
  useLacqueredClearcoat?: boolean;
};

/** Mapas de textura carregados (para aplicar ao MeshStandardMaterial). */
export interface TextureMaps {
  map?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
}

/** Configuração de material de cena (paredes, chão, room box). */
export interface SceneMaterialConfig {
  wall: {
    color: number;
    roughness: number;
    metalness: number;
    transparent: boolean;
    opacity: number;
  };
  wallExtra: {
    color: number;
    roughness: number;
    metalness: number;
    transparent: boolean;
    opacity: number;
  };
  floor: {
    color: number;
    roughness: number;
    metalness: number;
    sideDouble: boolean;
  };
  roomBox: {
    color: number;
    roughness: number;
    metalness: number;
    transparent: boolean;
    opacity: number;
  };
  ground: {
    color: string;
    roughness: number;
    metalness: number;
  };
}

/** Resultado compatível com LoadedWoodMaterial para integração com ViewerCore. */
export interface LoadedMaterialResult {
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
  textures: THREE.Texture[];
  loadDetailMaps: () => Promise<void>;
  areDetailMapsLoaded: () => boolean;
}
