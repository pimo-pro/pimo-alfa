import type { SceneOptions } from "@/3d/viewer-engine/scene";
import type { EnvironmentOptions } from "@/3d/viewer-engine/environment";
import type { CameraOptions } from "@/3d/viewer-engine/camera";
import type { RendererOptions } from "@/3d/viewer-engine/renderer";
import type { LightsOptions } from "@/3d/viewer-engine/lighting";
import type { ControlsOptions } from "@/3d/viewer-engine/controls";
import type { BoxOptions } from "@/3d/objects/BoxBuilder";

/** Opções de construção do ViewerCore (API pública estável). */
export type ViewerOptions = {
  background?: string;
  scene?: SceneOptions;
  environment?: EnvironmentOptions;
  camera?: CameraOptions;
  renderer?: RendererOptions;
  lights?: LightsOptions;
  controls?: ControlsOptions;
  enableControls?: boolean;
  box?: BoxOptions;
  /** Se true, não cria o box inicial "main"; módulos só aparecem ao gerar design ou carregar modelo. */
  skipInitialBox?: boolean;
};
