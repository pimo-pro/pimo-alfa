import qrcode from "qrcode-generator";
import type { BoxModule, CutListItemComPreco } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import { resolveAuthoritativeLabelNumber } from "./panelLabelNumber";

type ProjectQrContext = {
  projectName: string;
  boxes: BoxModule[];
  rules: RulesConfig;
};

function cyclicPieceNumber(index0: number, restart99: boolean): number {
  if (!restart99) return index0 + 1;
  return (index0 % 99) + 1;
}

function normalizePieceDigits(value: number): 2 | 3 {
  if (!Number.isFinite(value)) return 3;
  if (value <= 2) return 2;
  return 3;
}

function getPieceSuffix(pieceNumber: number, pieceDigits: 2 | 3): string {
  const maxNumber = 10 ** pieceDigits - 1;
  const safeNumber = ((Math.max(1, Math.floor(pieceNumber)) - 1) % maxNumber) + 1;
  return String(safeNumber).padStart(pieceDigits, "0");
}

export function getPieceLabel(pieceNumber: number, rules?: RulesConfig): string {
  const pieceDigits = normalizePieceDigits(rules?.qrcode?.numeroDigitosPeca ?? 3);
  return `P-${getPieceSuffix(pieceNumber, pieceDigits)}`;
}

const ETIQUETA_CODE_MAX_LENGTH = 14;

/**
 * Gera o código curto da etiqueta com 4 partes fixas (máx. 14 caracteres, sempre lowercase):
 * 1) Projeto: 3 a 5 letras iniciais
 * 2) Caixa: 2 letras
 * 3) Peça: 3 letras iniciais (ignorando espaços)
 * 4) Número: 2 dígitos (01-09) ou 3 dígitos (010-999)
 *
 * Se ultrapassar 14 caracteres, reduz na ordem:
 * - primeiro a peça (3→2→1)
 * - depois o projeto (5→4→3)
 */
export function generateEtiquetaCode(
  projectName: string,
  boxName: string,
  pieceName: string,
  pieceNumber: number
): string {
  const toLow = (s: string) => String(s || "").toLowerCase();
  const projRaw = toLow(projectName || "projeto").replace(/\s/g, "");
  const boxRaw = toLow(boxName || "xx");
  const pieceRaw = toLow(pieceName || "pec").replace(/\s/g, "");

  let projLen = Math.min(5, Math.max(3, projRaw.length));
  let proj = projRaw.slice(0, projLen).padEnd(projLen, projRaw[0] || "x");
  const box = boxRaw.slice(0, 2).padEnd(2, "x");
  let pieceLen = 3;
  let piece = pieceRaw.slice(0, pieceLen).padEnd(pieceLen, pieceRaw[0] || "x");

  const n = Math.max(1, Math.floor(pieceNumber));
  const num = n < 10 ? String(n).padStart(2, "0") : String(n).padStart(3, "0");

  let code = `${proj}${box}${piece}${num}`;

  while (code.length > ETIQUETA_CODE_MAX_LENGTH && pieceLen > 0) {
    pieceLen -= 1;
    piece = pieceRaw.slice(0, pieceLen).padEnd(pieceLen, pieceRaw[0] || "x");
    code = `${proj}${box}${piece}${num}`;
  }
  while (code.length > ETIQUETA_CODE_MAX_LENGTH && projLen > 3) {
    projLen -= 1;
    proj = projRaw.slice(0, projLen).padEnd(projLen, projRaw[0] || "x");
    code = `${proj}${box}${piece}${num}`;
  }

  return code.slice(0, ETIQUETA_CODE_MAX_LENGTH);
}

export function buildLocalQrPayload(
  piece: CutListItemComPreco,
  project: ProjectQrContext,
  pieceNumber: number
): string {
  const boxNome = project.boxes.find((b) => b.id === piece.boxId)?.nome ?? piece.boxId ?? "xx";
  return generateEtiquetaCode(
    project.projectName ?? "PROJETO",
    boxNome,
    piece.nome ?? "peca",
    pieceNumber
  );
}

export function generateShortCodeForPiece(
  piece: CutListItemComPreco,
  project: ProjectQrContext,
  pieceIndex0: number
): { shortCode: string; pieceNumber: number } {
  if (!project || !piece || !piece.tipo) {
    return { shortCode: "ERR", pieceNumber: 0 };
  }
  
  try {
    const restartAt99 = project.rules?.qrcode?.reiniciarContagemEm99 ?? true;
    const number = cyclicPieceNumber(pieceIndex0, restartAt99);
    const boxNome = project.boxes.find((b) => b.id === piece.boxId)?.nome ?? piece.boxId ?? "xx";
    const shortCode = generateEtiquetaCode(
      project.projectName ?? "PROJETO",
      boxNome,
      piece.nome ?? "peca",
      number
    );
    return { shortCode, pieceNumber: number };
  } catch (err) {
    console.warn("[qrcodeService] Error generating short code:", err);
    return { shortCode: "ERR", pieceNumber: 0 };
  }
}

type QrErrorLevel = "L" | "M" | "Q" | "H";

export function generateQrCodeSvg(content: string, errorLevel: QrErrorLevel = "M", margin = 0): string {
  const qr = qrcode(0, errorLevel);
  qr.addData(content);
  qr.make();
  return qr.createSvgTag({ scalable: true, margin });
}

export type QrLogoConfig = {
  logoDataUrl?: string;
  logoSizePercent?: number;
  /** Tamanho absoluto do logo no centro do QR (mm). Tem prioridade sobre percentagem. */
  logoSizeMm?: number;
  /** Tamanho do QR em mm (necessário quando logoSizeMm é usado). */
  qrSizeMm?: number;
  errorCorrection?: QrErrorLevel;
};

export async function generateQrCanvasWithLogo(
  data: string,
  size: number,
  config: QrLogoConfig = {}
): Promise<HTMLCanvasElement> {
  const qr = qrcode(0, config.errorCorrection ?? "H");
  qr.addData(data);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const moduleSize = size / Math.max(1, moduleCount);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D context from canvas");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000000";
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (!qr.isDark(r, c)) continue;
      const x = c * moduleSize;
      const y = r * moduleSize;
      ctx.fillRect(x, y, moduleSize, moduleSize);
    }
  }

  if (config.logoDataUrl) {
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => reject(new Error("Failed to load logo image"));
        logoImg.src = config.logoDataUrl!;
      });

      let logoDimension: number;
      if (config.logoSizeMm != null && config.logoSizeMm > 0 && config.qrSizeMm != null && config.qrSizeMm > 0) {
        logoDimension = (size * config.logoSizeMm) / config.qrSizeMm;
      } else {
        const logoPercent = Math.min(30, Math.max(10, config.logoSizePercent ?? 20));
        logoDimension = (size * logoPercent) / 100;
      }

      const logoX = (size - logoDimension) / 2;
      const logoY = (size - logoDimension) / 2;

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(logoX - 2, logoY - 2, logoDimension + 4, logoDimension + 4);
      ctx.drawImage(logoImg, logoX, logoY, logoDimension, logoDimension);
    } catch (err) {
      console.warn("[qrcodeService] Failed to render logo:", err);
    }
  }

  return canvas;
}

export function attachQrCodesToCutlist(
  items: CutListItemComPreco[],
  project: ProjectQrContext
): CutListItemComPreco[] {
  if (!items || !Array.isArray(items)) return [];
  if (!project || !project.rules || !project.rules.qrcode) {
    console.warn("[qrcodeService] Invalid project context, returning items without QR codes");
    return items;
  }
  
  return items.map((item, idx) => {
    if (!item || !item.tipo) {
      console.warn("[qrcodeService] Skipping invalid item:", item);
      return item;
    }
    
    try {
      const authoritative = resolveAuthoritativeLabelNumber(item);
      if (authoritative != null) {
        const boxNome = project.boxes.find((b) => b.id === item.boxId)?.nome ?? item.boxId ?? "xx";
        const shortCode =
          item.shortCode && String(item.shortCode).trim() !== "" && item.shortCode !== "ERR"
            ? String(item.shortCode)
            : generateEtiquetaCode(
                project.projectName ?? "PROJETO",
                boxNome,
                item.nome ?? "peca",
                authoritative
              );
        const qrPayload = buildLocalQrPayload(item, project, authoritative);
        return {
          ...item,
          pieceNumber: authoritative,
          shortCode,
          qrSvg: shortCode !== "ERR" ? generateQrCodeSvg(qrPayload) : "",
        };
      }
      const rawSc = String(item.shortCode ?? "").trim();
      if (rawSc && rawSc !== "ERR") {
        const pn =
          Number(item.pieceNumber ?? 0) > 0 && Number.isFinite(Number(item.pieceNumber))
            ? Math.floor(Number(item.pieceNumber))
            : null;
        const qrPayload =
          pn != null ? buildLocalQrPayload(item, project, pn) : rawSc;
        return {
          ...item,
          shortCode: rawSc,
          pieceNumber: pn ?? item.pieceNumber,
          qrSvg: generateQrCodeSvg(qrPayload),
        };
      }
      const generated = generateShortCodeForPiece(item, project, idx);
      const qrPayload = buildLocalQrPayload(item, project, generated.pieceNumber);
      return {
        ...item,
        shortCode: generated.shortCode,
        pieceNumber: generated.pieceNumber,
        qrSvg:
          generated.shortCode !== "ERR"
            ? generateQrCodeSvg(qrPayload)
            : "",
      };
    } catch (err) {
      console.warn(`[qrcodeService] Error attaching QR code to item ${idx}:`, err);
      return item;
    }
  });
}
