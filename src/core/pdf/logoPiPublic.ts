/**
 * Logo público `public/logo-pi.png` para PDFs (layout de corte, etiquetas).
 */

import type { jsPDF } from "jspdf";

export const LOGO_PI_PUBLIC_PATH = "/logo-pi.png";

const BRAND_RED_DEFAULT: [number, number, number] = [139, 0, 0];

function imageFormatFromDataUrl(dataUrl: string): "PNG" | "JPEG" | "WEBP" | null {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return "JPEG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return null;
}

/** Carrega o PNG público como data URL (fetch → FileReader). */
export async function loadLogoPiDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_PI_PUBLIC_PATH, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Retângulo branco + imagem no topo, ou "PIMO" em vermelho se não houver imagem.
 * `boxMm` — lado do quadrado (ex.: 9 mm no layout de corte).
 */
export function drawLogoPiInBox(
  doc: jsPDF,
  dataUrl: string | null,
  x: number,
  y: number,
  boxMm: number,
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
