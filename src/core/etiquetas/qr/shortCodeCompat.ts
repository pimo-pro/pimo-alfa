/**
 * Camada de compatibilidade S1 — reexporta o serviço legado sem alterar cutlist/técnico/drill.
 */

export {
  generateEtiquetaCode,
  generateShortCodeForPiece,
  buildLocalQrPayload,
  attachQrCodesToCutlist,
  getPieceLabel,
} from "../../qrcode/qrcodeService";

export { resolveAuthoritativeLabelNumber } from "../../qrcode/panelLabelNumber";
