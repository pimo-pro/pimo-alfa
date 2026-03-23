/**
 * Marca d'água com logo PIMO (logo-pi.png) em canvas 2D.
 */

import { loadLogoPiDataUrl } from "../core/pdf/logoPiPublic";

export interface WatermarkOptions {
  /** Opacidade da marca d'água (0.1–0.2 recomendado). */
  opacity?: number;
  /** Posição: 'bottom-right' | 'center'. */
  position?: "bottom-right" | "center";
  /** Largura da marca em % da largura do canvas (ex: 0.10–0.15). */
  widthPercent?: number;
  /** URL do logo (deve estar em public para funcionar em build). */
  logoUrl?: string;
}

const DEFAULT_LOGO_URL = "/logo-pi.png";
const DEFAULT_OPACITY = 0.15;
const DEFAULT_WIDTH_PERCENT = 0.12;
const DEFAULT_PADDING_PERCENT = 0.02;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${src}`));
    img.src = src;
  });
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return loadImage(dataUrl);
}

/**
 * Remove fundo preto (quase preto) do logo, mantendo o π e cores.
 */
function keyBlackBackgroundToTransparent(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const sctx = sourceCanvas.getContext("2d");
  const octx = out.getContext("2d");
  if (!sctx || !octx) return sourceCanvas;
  octx.drawImage(sourceCanvas, 0, 0);
  const imgData = octx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    if (r < 28 && g < 28 && b < 28) {
      d[i + 3] = 0;
    }
  }
  octx.putImageData(imgData, 0, 0);
  return out;
}

/**
 * Marca d'água para exportação Photo Mode: logo-pi via `loadLogoPiDataUrl`, sem fundo preto, canto inferior direito.
 */
export async function applyLogoPiPhotoWatermark(
  canvas: HTMLCanvasElement,
  options: { opacity?: number; widthPercent?: number; position?: "bottom-right" | "center" } = {}
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const opacity = options.opacity ?? 0.75;
  const widthPercent = options.widthPercent ?? 0.08;
  const position = options.position ?? "bottom-right";
  const padding = Math.max(8, Math.min(canvas.width, canvas.height) * DEFAULT_PADDING_PERCENT);

  const dataUrl = await loadLogoPiDataUrl();
  let img: HTMLImageElement;
  try {
    if (dataUrl) {
      img = await loadImageFromDataUrl(dataUrl);
    } else {
      img = await loadImage(DEFAULT_LOGO_URL);
    }
  } catch {
    return;
  }

  const tmp = document.createElement("canvas");
  tmp.width = img.naturalWidth || img.width;
  tmp.height = img.naturalHeight || img.height;
  const tctx = tmp.getContext("2d");
  if (!tctx) return;
  tctx.drawImage(img, 0, 0);
  const keyed = keyBlackBackgroundToTransparent(tmp);

  const cw = canvas.width;
  const ch = canvas.height;
  const logoWidth = Math.max(32, Math.round(cw * widthPercent));
  const logoHeight = Math.round((logoWidth * keyed.height) / Math.max(1, keyed.width));

  let x: number;
  let y: number;
  if (position === "center") {
    x = (cw - logoWidth) / 2;
    y = (ch - logoHeight) / 2;
  } else {
    x = cw - logoWidth - padding;
    y = ch - logoHeight - padding;
  }

  ctx.save();
  ctx.globalAlpha = Math.max(0.05, Math.min(1, opacity));
  ctx.drawImage(keyed, x, y, logoWidth, logoHeight);
  ctx.restore();
}

/**
 * Desenha o logo como marca d'água no canvas (método legado simples).
 * @param canvas - Canvas já preenchido com a imagem de destino
 * @param options - Opacidade, posição e tamanho
 */
export async function applyImageWatermark(
  canvas: HTMLCanvasElement,
  options: WatermarkOptions = {}
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const {
    opacity = DEFAULT_OPACITY,
    position = "bottom-right",
    widthPercent = DEFAULT_WIDTH_PERCENT,
    logoUrl = DEFAULT_LOGO_URL,
  } = options;

  const width = canvas.width;
  const height = canvas.height;
  const padding = Math.max(12, Math.min(width, height) * DEFAULT_PADDING_PERCENT);
  const logoWidth = Math.max(40, Math.round(width * widthPercent));
  const logoHeight = Math.round((logoWidth * 9) / 16);

  let img: HTMLImageElement;
  try {
    img = await loadImage(logoUrl);
  } catch {
    return;
  }

  let x: number;
  let y: number;
  if (position === "center") {
    x = (width - logoWidth) / 2;
    y = (height - logoHeight) / 2;
  } else {
    x = width - logoWidth - padding;
    y = height - logoHeight - padding;
  }

  ctx.save();
  ctx.globalAlpha = Math.max(0.1, Math.min(0.2, opacity));
  ctx.drawImage(img, x, y, logoWidth, logoHeight);
  ctx.restore();
}
