/**
 * Logótipo industrial exclusivo para PDFs (`public/pimo-logo-industrial.png`).
 * NÃO substitui `logo-pi.png` usado no site / UI / Header.
 */

import type { jsPDF } from "jspdf";

export const LOGO_INDUSTRIAL_PUBLIC_PATH = "/pimo-logo-industrial.png";
export const LOGO_INDUSTRIAL_SIZE_MM = 10;

const BRAND_RED_DEFAULT: [number, number, number] = [139, 0, 0];

let cachedDataUrl: string | null | undefined;

function imageFormatFromDataUrl(dataUrl: string): "PNG" | "JPEG" | "WEBP" | null {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return "JPEG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return null;
}

/** Cache síncrono (após preload). `undefined` = ainda não carregado. */
export function getCachedLogoIndustrialDataUrl(): string | null {
  return cachedDataUrl === undefined ? null : cachedDataUrl;
}

/** Carrega o PNG industrial e memoiza. */
export async function loadLogoIndustrialDataUrl(): Promise<string | null> {
  if (cachedDataUrl !== undefined) return cachedDataUrl;
  try {
    const res = await fetch(LOGO_INDUSTRIAL_PUBLIC_PATH, { cache: "force-cache" });
    if (!res.ok) {
      cachedDataUrl = null;
      return null;
    }
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
    cachedDataUrl = dataUrl;
    return dataUrl;
  } catch {
    cachedDataUrl = null;
    return null;
  }
}

/** Garante cache preenchido antes de gerar PDFs síncronos. */
export async function ensureLogoIndustrialLoaded(): Promise<string | null> {
  return loadLogoIndustrialDataUrl();
}

/**
 * Quadrado 10—10 mm (ou `boxMm`) com o logótipo industrial.
 * Fallback: texto "PIMO" em vermelho.
 */
export function drawLogoIndustrialInBox(
  doc: jsPDF,
  dataUrl: string | null,
  x: number,
  y: number,
  boxMm: number = LOGO_INDUSTRIAL_SIZE_MM,
  brandRgb: [number, number, number] = BRAND_RED_DEFAULT
): void {
  doc.setDrawColor(255, 255, 255);
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, boxMm, boxMm, "FD");

  if (dataUrl) {
    const fmt = imageFormatFromDataUrl(dataUrl);
    if (fmt) {
      try {
        doc.addImage(dataUrl, fmt, x, y, boxMm, boxMm);
        return;
      } catch {
        /* fallback texto */
      }
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(Math.min(11, boxMm * 1.15));
  doc.setTextColor(...brandRgb);
  doc.text("PIMO", x + boxMm / 2, y + boxMm / 2 + 1.1, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

/** Invalidar cache (testes). */
export function clearLogoIndustrialCacheForTests(): void {
  cachedDataUrl = undefined;
}
