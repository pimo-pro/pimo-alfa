/**
 * Tipos para o sistema de régua (medição) no viewer.
 * Etapa 1: Edge Picking. Etapa 2: cálculo de distâncias.
 */

import type * as THREE from "three";

/** Tipo de entidade pickada: caixa, parede, chão, furo (porta/janela) ou ponto (vértice). */
export type RulerPickType = "caixa" | "parede" | "chão" | "furo" | "ponto";

/** Resultado do Edge Picking: ponto no edge mais próximo do cursor, objeto e tipo. */
export type RulerEdgePickResult = {
  /** Ponto 3D mais próximo no edge (ou vértice quando type === "ponto"). */
  point: THREE.Vector3;
  /** Objeto do cenário (mesh ou grupo) ao qual o edge pertence. */
  object: THREE.Object3D;
  /** Tipo da entidade. */
  type: RulerPickType;
};

/** Tipo de medição segundo a direção dominante: horizontal (X), vertical (Y), profundidade (Z). */
export type RulerMeasurementType = "horizontal" | "vertical" | "profundidade";

/** Resultado de um cálculo de distância: distância em metros, extremos e tipo de medição. */
export type RulerDistanceResult = {
  /** Distância em metros. */
  distance: number;
  /** Ponto A (primeiro extremo). */
  pointA: THREE.Vector3;
  /** Ponto B (segundo extremo). */
  pointB: THREE.Vector3;
  /** Tipo de medição (horizontal, vertical, profundidade), quando aplicável. */
  measurementType: RulerMeasurementType;
};

/** Uma medição do RulerManager: distância em mm (inteiro), extremos para posicionar o label. */
export type RulerManagerMeasurement = {
  distanceMm: number;
  pointA: THREE.Vector3;
  pointB: THREE.Vector3;
};

/** Resultado bruto do RulerManager: todas as medições candidatas. */
export type RulerManagerResult = {
  horizontalLeft: RulerManagerMeasurement | null;
  horizontalRight: RulerManagerMeasurement | null;
  front: RulerManagerMeasurement | null;
  back: RulerManagerMeasurement | null;
  floor: RulerManagerMeasurement | null;
  ceiling: RulerManagerMeasurement | null;
};

// --- Régua interna (medição dentro do box) ---

/** Tipo do elemento interno pickado: vértice, edge, face ou furo. */
export type InternalRulerPickType = "vertex" | "edge" | "face" | "hole";

/** Tipo de snap aplicado (Smart Snapping). */
export type SnapType =
  | "vertex"
  | "edgeMidpoint"
  | "edgeIntersection"
  | "holeCenter"
  | "faceCenter"
  | "partReference"
  | "alignment";

/** Resultado do picking interno: ponto efetivo (já snapado se aplicável), tipo e referência ao mesh. */
export type InternalRulerPickResult = {
  /** Ponto final a usar para medição e A/B (snapado se houve snap, senão original). */
  point: THREE.Vector3;
  /** Ponto original do raycast (antes do snap). */
  pointOriginal: THREE.Vector3;
  /** Ponto snapado (null se nenhum candidato dentro do raio). */
  pointSnapped: THREE.Vector3 | null;
  /** Tipo de snap aplicado (null se sem snap). */
  snapType: SnapType | null;
  type: InternalRulerPickType;
  object: THREE.Object3D;
  /** Índices dos vértices a destacar (1 para vertex, 2 para edge, 3 para face). */
  vertexIndices: number[];
};
