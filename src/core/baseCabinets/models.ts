import { BOX_MODELS_REGISTRY } from "../../data/moveisUnificados/boxModelsRegistry";
import { PI_BASE_MODELS } from "../../data/moveisUnificados/pi/models";

/**
 * Modelos base estáticos (catálogo + PI). Modelos personalizados são merged em runtime.
 */
export const BASE_CABINET_STATIC_MODELS = [...BOX_MODELS_REGISTRY, ...PI_BASE_MODELS];

/** @deprecated Use getBaseCabinetModelsMerged() para incluir modelos personalizados. */
export const BASE_CABINET_MODELS = BASE_CABINET_STATIC_MODELS;
