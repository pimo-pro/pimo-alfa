// ViewerCore: Orquestrador fino, delega para módulos especializados.
import { RoomManager } from "./RoomManager";
import { SnapshotManager } from "./SnapshotManager";
import { CollisionManager } from "./CollisionManager";
import { ReflowManager } from "./ReflowManager";
import { ToolsManager } from "./ToolsManager";

export class ViewerCore {
  roomManager: RoomManager;
  snapshotManager: SnapshotManager;
  collisionManager: CollisionManager;
  reflowManager: ReflowManager;
  toolsManager: ToolsManager;
  materialsManager: Record<string, unknown>;
  rulerManager: Record<string, unknown>;

  constructor() {
    this.roomManager = new RoomManager(this);
    this.snapshotManager = new SnapshotManager(this);
    this.collisionManager = new CollisionManager(this);
    this.reflowManager = new ReflowManager(this);
    this.toolsManager = new ToolsManager(this);
    this.materialsManager = {
      updateBoxMaterial: (_boxId: string, _materialId: string) => true,
      updateDoorMaterial: (_doorId: string, _materialId: string) => true,
      updateDrawerMaterial: (_drawerId: string, _materialId: string) => true,
      setMaterialMode: (mode: unknown) => mode,
      getMaterialMode: () => "default",
      setMaterialQuality: (quality: unknown) => quality,
      getMaterialQuality: () => "standard",
      applyMaterialPreset: (presetId: unknown) => presetId,
    };
    this.rulerManager = {
      getRulerEdgeAtPointer: (_pointer: unknown) => null,
      getRulerMeasurements: () => {
        // TODO: Implementar obtenção de medidas da régua
        return [];
      },
      setRulerEnabled: (enabled: unknown) => enabled,
      getInternalRulerPickAtPointer: (_pointer: unknown) => null,
      cycleInternalRulerSelection: () => {
        // TODO: Implementar ciclo de seleção interna da régua
        return true;
      },
      clearInternalRulerSelection: () => {
        // TODO: Implementar limpeza de seleção interna
        return true;
      },
      getInternalRulerMeasurement: () => {
        // TODO: Implementar obtenção de medida interna
        return null;
      },
    };
  }
}
