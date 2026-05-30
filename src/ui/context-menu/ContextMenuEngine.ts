export type MouseMenuTargetType =
  | "empty"
  | "box"
  | "door"
  | "drawer"
  | "piece"
  | "remate"
  | "room";

export type MouseMenuTarget = {
  type: MouseMenuTargetType;
  boxId?: string;
  panelId?: string;
  panelType?: string;
  doorLayerId?: string;
  drawerLayerId?: string;
  remateId?: string;
  wallId?: number;
  roomElementId?: string;
};

export type MouseMenuCategoryId =
  | "box"
  | "porta"
  | "peca"
  | "remate"
  | "sala"
  | "materiais"
  | "cutlist"
  | "ferramentas";

export type MouseMenuActionId =
  | "box.lockToggle"
  | "box.rename"
  | "box.duplicate"
  | "box.delete"
  | "box.alignFront"
  | "box.alignBottom"
  | "porta.material"
  | "gaveta.material"
  | "peca.material"
  | "remate.remove"
  | "remate.material"
  | "sala.roomSnappingToggle"
  | "materiais.mousePreset"
  | "cutlist.open"
  | "ferramentas.internalRulerToggle"
  | "ferramentas.snappingToggle"
  | "ferramentas.snapModeToggle"
  | "ferramentas.autoAlignmentToggle"
  | "ferramentas.autoSpacingToggle"
  | "ferramentas.wallOffset"
  | "ferramentas.fillWall"
  | "ferramentas.extendAlongWall"
  | "ferramentas.distributeBoxes"
  | "ferramentas.autoStackShelves";

export type MouseMenuAction = {
  id: MouseMenuActionId;
  label: string;
  danger?: boolean;
};

export type MouseMenuCategory = {
  id: MouseMenuCategoryId;
  label: string;
  actions: MouseMenuAction[];
};

export type MouseMenuEngineInput = {
  target: MouseMenuTarget | null;
  hasSelectedBox: boolean;
  hasRoom: boolean;
  hasRemates: boolean;
  multiSelectionCount: number;
};

function isGeneralTarget(target: MouseMenuTarget | null): boolean {
  return !target || target.type === "empty";
}

export function buildMouseMenu(input: MouseMenuEngineInput): MouseMenuCategory[] {
  const target = input.target ?? { type: "empty" as const };
  const categories: MouseMenuCategory[] = [];

  if (target.type === "box") {
    categories.push({
      id: "box",
      label: "Box",
      actions: [
        { id: "box.lockToggle", label: "Bloquear / desbloquear" },
        { id: "box.rename", label: "Renomear" },
        { id: "box.duplicate", label: "Duplicar" },
        { id: "box.alignFront", label: "Alinhar pela frente" },
        { id: "box.alignBottom", label: "Alinhar baixo" },
        { id: "box.delete", label: "Excluir", danger: true },
      ],
    });
  }

  if (target.type === "door") {
    categories.push({
      id: "porta",
      label: "Porta",
      actions: [{ id: "porta.material", label: "Alterar material" }],
    });
  }

  if (target.type === "drawer") {
    categories.push({
      id: "peca",
      label: "Peça",
      actions: [{ id: "gaveta.material", label: "Alterar material da frente" }],
    });
  }

  if (target.type === "piece") {
    categories.push({
      id: "peca",
      label: "Peça",
      actions: [{ id: "peca.material", label: "Alterar material" }],
    });
  }

  if (target.type === "remate" || (!isGeneralTarget(target) && input.hasRemates)) {
    categories.push({
      id: "remate",
      label: "Remate",
      actions: [
        { id: "remate.material", label: "Alterar material" },
        { id: "remate.remove", label: "Remover remate", danger: true },
      ],
    });
  }

  if (target.type === "room" && input.hasRoom) {
    categories.push({
      id: "sala",
      label: "Sala",
      actions: [{ id: "sala.roomSnappingToggle", label: "Room snapping" }],
    });
  }

  if (!isGeneralTarget(target)) {
    categories.push({
      id: "materiais",
      label: "Materiais",
      actions: [{ id: "materiais.mousePreset", label: "Modo do mouse" }],
    });
  }

  categories.push({
    id: "cutlist",
    label: "Cutlist",
    actions: [{ id: "cutlist.open", label: "Abrir / consultar cutlist" }],
  });

  categories.push({
    id: "ferramentas",
    label: "Ferramentas",
    actions: [
      ...(input.hasSelectedBox
        ? [{ id: "ferramentas.internalRulerToggle" as const, label: "Régua interna" }]
        : []),
      { id: "ferramentas.snappingToggle", label: "Snapping" },
      { id: "ferramentas.snapModeToggle", label: "Modo snapping" },
      ...(input.hasRoom
        ? [
            { id: "ferramentas.autoAlignmentToggle" as const, label: "Auto-alignment" },
            { id: "ferramentas.autoSpacingToggle" as const, label: "Auto-spacing" },
            { id: "ferramentas.wallOffset" as const, label: "Wall offset" },
          ]
        : []),
      ...(input.hasSelectedBox && input.hasRoom
        ? [
            { id: "ferramentas.fillWall" as const, label: "Preencher parede" },
            { id: "ferramentas.extendAlongWall" as const, label: "Estender layout" },
          ]
        : []),
      ...(input.multiSelectionCount >= 2
        ? [{ id: "ferramentas.distributeBoxes" as const, label: "Distribuir caixas" }]
        : []),
      ...(input.hasSelectedBox
        ? [{ id: "ferramentas.autoStackShelves" as const, label: "Auto-stack prateleiras" }]
        : []),
    ],
  });

  return categories.filter((category) => category.actions.length > 0);
}
