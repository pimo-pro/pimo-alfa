/**
 * Validation Engine — Verificador de erros do projeto.
 * Detecta colisões, peças fora da sala, materiais e ferragens incompletas.
 */

import type { WorkspaceBox, BoxModule } from "../types";
import type { RoomConfig } from "../../context/projectTypes";
import { boxesOverlap } from "../rules/positioning";

export type ValidationSeverity = "error" | "warning";

export type ValidationItem = {
  id: string;
  type: string;
  message: string;
  severity: ValidationSeverity;
  boxId?: string;
  boxNome?: string;
};

export type ValidationResult = {
  items: ValidationItem[];
  hasErrors: boolean;
  hasWarnings: boolean;
};

const MARGIN_MM = 5;

/** Converte posição workspace (mm, Y no chão) para centro em mm. */
function boxCenterMm(ws: WorkspaceBox): { x: number; y: number; z: number } {
  const w = ws.dimensoes.largura;
  const h = ws.dimensoes.altura;
  const d = ws.dimensoes.profundidade;
  const x = (ws.posicaoX_mm ?? 0) + w / 2;
  const y = (ws.posicaoY_mm ?? 0) + h / 2;
  const z = (ws.posicaoZ_mm ?? 0) + d / 2;
  return { x, y, z };
}

/** Verifica se duas caixas se sobrepõem (em mm). */
function boxesCollide(a: WorkspaceBox, b: WorkspaceBox): boolean {
  const posA = boxCenterMm(a);
  const posB = boxCenterMm(b);
  return boxesOverlap(
    posA,
    a.dimensoes,
    posB,
    b.dimensoes,
    MARGIN_MM
  );
}

/** Calcula limites da sala em mm (centro da sala em 0,0,0; paredes formam retângulo). */
function getRoomBoundsMm(config: RoomConfig): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
} {
  const walls = config.walls.slice(0, config.numWalls);
  if (walls.length === 0) {
    return { minX: -Infinity, maxX: Infinity, minZ: -Infinity, maxZ: Infinity, minY: 0, maxY: Infinity };
  }
  const L0 = walls[0].lengthMm;
  const L1 = walls[1]?.lengthMm ?? walls[0].lengthMm;
  const L2 = walls[2]?.lengthMm ?? L0;
  const L3 = walls[3]?.lengthMm ?? L1;
  const halfW = Math.max(L0, L2) / 2;
  const halfD = Math.max(L1, L3) / 2;
  const maxH = Math.max(...walls.map((w) => w.heightMm), 2400);
  const margin = 50;
  return {
    minX: -halfW + margin,
    maxX: halfW - margin,
    minZ: -halfD + margin,
    maxZ: halfD - margin,
    minY: 0,
    maxY: maxH - margin,
  };
}

/** Verifica se caixa está dentro dos limites da sala. */
function isBoxInsideRoom(ws: WorkspaceBox, bounds: ReturnType<typeof getRoomBoundsMm>): boolean {
  const pos = boxCenterMm(ws);
  const halfW = ws.dimensoes.largura / 2;
  const halfH = ws.dimensoes.altura / 2;
  const halfD = ws.dimensoes.profundidade / 2;
  return (
    pos.x - halfW >= bounds.minX &&
    pos.x + halfW <= bounds.maxX &&
    pos.y - halfH >= bounds.minY &&
    pos.y + halfH <= bounds.maxY &&
    pos.z - halfD >= bounds.minZ &&
    pos.z + halfD <= bounds.maxZ
  );
}

/** Verifica se caixa tem material definido. */
function hasMaterial(box: BoxModule): boolean {
  return Boolean(box.material && String(box.material).trim().length > 0);
}

/** Verifica se caixa com portas/gavetas tem ferragens básicas (aproximado). */
function hasRequiredFerragens(box: BoxModule): boolean {
  const ferragens = box.ferragens ?? [];
  if (box.portaTipo && box.portaTipo !== "sem_porta") {
    const hasDobradicas = ferragens.some(
      (f) => /dobradiça|hinge|charnela/i.test(f.nome ?? "")
    );
    if (!hasDobradicas) return false;
  }
  if (box.gavetas > 0) {
    const hasTrilhos = ferragens.some(
      (f) => /trilho|runner|corrediça/i.test(f.nome ?? "")
    );
    if (!hasTrilhos) return false;
  }
  return true;
}

/** Porta abre ~90° para fora — simplificação: verifica se vizinha está na frente. */
function doorMayCollide(ws: WorkspaceBox, others: WorkspaceBox[]): boolean {
  if (!ws.portaTipo || ws.portaTipo === "sem_porta") return false;
  const pos = boxCenterMm(ws);
  const d = ws.dimensoes.profundidade;
  for (const o of others) {
    if (o.id === ws.id) continue;
    const oPos = boxCenterMm(o);
    const od = o.dimensoes.profundidade;
    const distX = Math.abs(pos.x - oPos.x);
    const distZ = Math.abs(pos.z - oPos.z);
    const minDist = (d + od) / 2 + 50;
    if (distX < minDist && distZ < minDist) return true;
  }
  return false;
}

/** Gaveta estende ~profundidade para fora — simplificação. */
function drawerMayCollide(ws: WorkspaceBox, others: WorkspaceBox[]): boolean {
  if (!ws.gavetas || ws.gavetas === 0) return false;
  const pos = boxCenterMm(ws);
  const extend = ws.dimensoes.profundidade;
  for (const o of others) {
    if (o.id === ws.id) continue;
    const oPos = boxCenterMm(o);
    const dist = Math.hypot(pos.x - oPos.x, pos.z - oPos.z);
    const minDist = extend + o.dimensoes.largura / 2 + 30;
    if (dist < minDist) return true;
  }
  return false;
}

function expectedPanelIds(box: BoxModule): string[] {
  const ids = box.panelIds;
  if (!ids) return [];
  const out: string[] = [];
  const push = (value: string | undefined | null) => {
    if (typeof value === "string" && value.trim().length > 0) out.push(value);
  };
  push(ids.cima);
  push(ids.fundo);
  push(ids.lateral_esquerda);
  push(ids.lateral_direita);
  push(ids.costa);
  (ids.prateleiras ?? []).forEach(push);
  (ids.portas ?? []).forEach(push);
  (ids.gavetas ?? []).forEach(push);
  return out;
}

function expectedStructuralPanelIds(box: BoxModule): string[] {
  const ids = box.panelIds;
  if (!ids) return [];
  return [ids.cima, ids.fundo, ids.lateral_esquerda, ids.lateral_direita, ids.costa]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeCutListIds(box: BoxModule): Set<string> {
  const ids = new Set<string>();
  (box.cutList ?? []).forEach((item) => {
    if (typeof item.id === "string" && item.id.trim().length > 0) ids.add(item.id);
  });
  return ids;
}

function hasPieceDrills(box: BoxModule, pieceId: string): boolean {
  const piece = (box.cutList ?? []).find((item) => item.id === pieceId);
  if (!piece) return false;
  return Boolean(
    (piece.furacoes && piece.furacoes.length > 0) ||
    (piece.furacoesTecnicas && piece.furacoesTecnicas.length > 0) ||
    (piece.holes && piece.holes.length > 0)
  );
}

function validateRoomConfig(roomConfig: RoomConfig | null | undefined, nextId: () => string): ValidationItem[] {
  if (!roomConfig) return [];
  const walls = roomConfig.walls ?? [];
  const issues: ValidationItem[] = [];
  if (roomConfig.numWalls < 3 || roomConfig.numWalls > 4) {
    issues.push({
      id: nextId(),
      type: "invalid_room_num_walls",
      severity: "error",
      message: `Sala inválida: número de paredes (${roomConfig.numWalls}) fora do intervalo permitido (3-4).`,
    });
  }
  if (walls.length < roomConfig.numWalls) {
    issues.push({
      id: nextId(),
      type: "invalid_room_missing_walls",
      severity: "error",
      message: "Sala inválida: faltam paredes para a configuração atual.",
    });
  }
  walls.forEach((wall, index) => {
    if (!Number.isFinite(wall.lengthMm) || wall.lengthMm <= 0) {
      issues.push({
        id: nextId(),
        type: "invalid_wall_length",
        severity: "error",
        message: `Parede ${index + 1} com comprimento inválido.`,
      });
    }
    if (!Number.isFinite(wall.heightMm) || wall.heightMm <= 0) {
      issues.push({
        id: nextId(),
        type: "invalid_wall_height",
        severity: "error",
        message: `Parede ${index + 1} com altura inválida.`,
      });
    }
    if (!Number.isFinite(wall.thicknessMm) || wall.thicknessMm <= 0) {
      issues.push({
        id: nextId(),
        type: "invalid_wall_thickness",
        severity: "warning",
        message: `Parede ${index + 1} com espessura inválida.`,
      });
    }
    (wall.openings ?? []).forEach((opening) => {
      const openingEnd = opening.horizontalOffsetMm + opening.widthMm;
      if (opening.horizontalOffsetMm < 0 || openingEnd > wall.lengthMm) {
        issues.push({
          id: nextId(),
          type: "invalid_wall_opening_horizontal",
          severity: "error",
          message: `Abertura fora dos limites horizontais na parede ${index + 1}.`,
        });
      }
      const openingTop = opening.floorOffsetMm + opening.heightMm;
      if (opening.floorOffsetMm < 0 || openingTop > wall.heightMm) {
        issues.push({
          id: nextId(),
          type: "invalid_wall_opening_vertical",
          severity: "error",
          message: `Abertura fora dos limites verticais na parede ${index + 1}.`,
        });
      }
    });
  });
  return issues;
}

export type ValidateProjectParams = {
  workspaceBoxes: WorkspaceBox[];
  boxes: BoxModule[];
  roomConfig?: RoomConfig | null;
};

/**
 * Valida o projeto e retorna lista de avisos/erros.
 */
export function validateProject(params: ValidateProjectParams): ValidationResult {
  const { workspaceBoxes, boxes, roomConfig } = params;
  const items: ValidationItem[] = [];
  let idCounter = 0;
  const nextId = () => `v-${++idCounter}`;

  const boxById = new Map(boxes.map((b) => [b.id, b]));
  const workspaceIds = new Set(workspaceBoxes.map((box) => box.id));

  if (workspaceBoxes.length === 0) {
    items.push({
      id: nextId(),
      type: "empty_project",
      message: "Projeto sem caixas no workspace.",
      severity: "warning",
    });
  }

  const duplicateWorkspaceIds = new Set<string>();
  const seenWorkspaceIds = new Set<string>();
  workspaceBoxes.forEach((ws) => {
    if (seenWorkspaceIds.has(ws.id)) duplicateWorkspaceIds.add(ws.id);
    seenWorkspaceIds.add(ws.id);
  });
  duplicateWorkspaceIds.forEach((dupId) => {
    items.push({
      id: nextId(),
      type: "duplicate_workspace_box",
      message: `ID de caixa duplicado no workspace: ${dupId}`,
      severity: "error",
      boxId: dupId,
    });
  });

  items.push(...validateRoomConfig(roomConfig, nextId));

  for (let i = 0; i < workspaceBoxes.length; i++) {
    const a = workspaceBoxes[i];
    const boxA = boxById.get(a.id);

    for (let j = i + 1; j < workspaceBoxes.length; j++) {
      const b = workspaceBoxes[j];
      if (boxesCollide(a, b)) {
        items.push({
          id: nextId(),
          type: "collision",
          message: `Caixas sobrepostas: ${a.nome} e ${b.nome}`,
          severity: "error",
          boxId: a.id,
          boxNome: a.nome,
        });
      }
    }

    if (roomConfig) {
      const bounds = getRoomBoundsMm(roomConfig);
      if (!isBoxInsideRoom(a, bounds)) {
        items.push({
          id: nextId(),
          type: "out_of_room",
          message: `Peça "${a.nome}" fora da sala`,
          severity: "error",
          boxId: a.id,
          boxNome: a.nome,
        });
      }
    }

    if (boxA) {
      const expectedIds = expectedPanelIds(boxA);
      const expectedStructuralIds = expectedStructuralPanelIds(boxA);
      const cutListIds = normalizeCutListIds(boxA);

      if ((boxA.cutList?.length ?? 0) === 0) {
        items.push({
          id: nextId(),
          type: "incomplete_box",
          message: `Caixa "${a.nome}" sem cutlist gerada.`,
          severity: "error",
          boxId: a.id,
          boxNome: a.nome,
        });
      }

      if (expectedIds.length > 0) {
        const missingPieces = expectedIds.filter((id) => !cutListIds.has(id));
        missingPieces.forEach((missingId) => {
          items.push({
            id: nextId(),
            type: "missing_piece",
            message: `Peça faltando na caixa "${a.nome}": ${missingId}`,
            severity: "warning",
            boxId: a.id,
            boxNome: a.nome,
          });
        });

        const missingStructural = expectedStructuralIds.filter((id) => !cutListIds.has(id));
        if (missingStructural.length > 0) {
          items.push({
            id: nextId(),
            type: "incomplete_structural_box",
            message: `Caixa "${a.nome}" incompleta: faltam peças estruturais.`,
            severity: "error",
            boxId: a.id,
            boxNome: a.nome,
          });
        }
      }

      const drillWithoutPiece = (boxA.cutList ?? []).filter((piece) => {
        const pieceHasDrills = hasPieceDrills(boxA, piece.id);
        if (!pieceHasDrills) return false;
        if (!boxA.panelIds) return false;
        return !expectedIds.includes(piece.id);
      });
      if (drillWithoutPiece.length > 0) {
        items.push({
          id: nextId(),
          type: "drill_without_piece",
          message: `Furações sem peça estrutural reconhecida na caixa "${a.nome}".`,
          severity: "warning",
          boxId: a.id,
          boxNome: a.nome,
        });
      }

      const invalidDims =
        !Number.isFinite(boxA.dimensoes.largura) || boxA.dimensoes.largura <= 0 ||
        !Number.isFinite(boxA.dimensoes.altura) || boxA.dimensoes.altura <= 0 ||
        !Number.isFinite(boxA.dimensoes.profundidade) || boxA.dimensoes.profundidade <= 0;
      if (invalidDims) {
        items.push({
          id: nextId(),
          type: "invalid_box_dimensions",
          message: `Caixa "${a.nome}" com dimensões inválidas.`,
          severity: "error",
          boxId: a.id,
          boxNome: a.nome,
        });
      }

      const orphanDoor = (boxA.doorsLayer ?? []).some((door) => door.parentBoxId !== boxA.id);
      if (orphanDoor) {
        items.push({
          id: nextId(),
          type: "door_without_box",
          message: `Porta sem caixa válida em "${a.nome}".`,
          severity: "error",
          boxId: a.id,
          boxNome: a.nome,
        });
      }

      const orphanDrawer = (boxA.drawersLayer ?? []).some((drawer) => drawer.parentBoxId !== boxA.id);
      if (orphanDrawer) {
        items.push({
          id: nextId(),
          type: "drawer_without_box",
          message: `Gaveta sem caixa válida em "${a.nome}".`,
          severity: "error",
          boxId: a.id,
          boxNome: a.nome,
        });
      }

      if (!hasMaterial(boxA)) {
        items.push({
          id: nextId(),
          type: "no_material",
          message: `Caixa "${a.nome}" sem material definido`,
          severity: "warning",
          boxId: a.id,
          boxNome: a.nome,
        });
      }
      if (!hasRequiredFerragens(boxA)) {
        items.push({
          id: nextId(),
          type: "missing_ferragens",
          message: `Ferragens incompletas em "${a.nome}"`,
          severity: "warning",
          boxId: a.id,
          boxNome: a.nome,
        });
      }
    }

    if (doorMayCollide(a, workspaceBoxes)) {
      items.push({
        id: nextId(),
        type: "door_collision",
        message: `Porta de "${a.nome}" pode colidir com outra peça ao abrir`,
        severity: "warning",
        boxId: a.id,
        boxNome: a.nome,
      });
    }

    if (drawerMayCollide(a, workspaceBoxes)) {
      items.push({
        id: nextId(),
        type: "drawer_collision",
        message: `Gaveta de "${a.nome}" pode colidir ao abrir`,
        severity: "warning",
        boxId: a.id,
        boxNome: a.nome,
      });
    }
  }

  for (const modelBox of boxes) {
    if (!workspaceIds.has(modelBox.id)) {
      items.push({
        id: nextId(),
        type: "orphan_box_model",
        message: `Caixa calculada sem correspondente no workspace: ${modelBox.nome}`,
        severity: "warning",
        boxId: modelBox.id,
        boxNome: modelBox.nome,
      });
    }
  }

  const hasErrors = items.some((i) => i.severity === "error");
  const hasWarnings = items.some((i) => i.severity === "warning");

  return {
    items,
    hasErrors,
    hasWarnings,
  };
}

/**
 * Validação leve para alertas automáticos (ao adicionar/mover caixa).
 * Retorna apenas erros críticos.
 */
export function validateProjectLight(params: ValidateProjectParams): ValidationItem[] {
  const result = validateProject(params);
  return result.items.filter((i) => i.severity === "error");
}
