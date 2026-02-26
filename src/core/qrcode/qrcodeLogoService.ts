/**
 * Geração de QR Code com logotipo integrado no centro.
 * 
 * - Suporta logo em PNG com fundo transparente
 * - Logo renderizado no centro do QR (15-30% da área)
 * - Nível de correção de erro: H (máximo)
 * - Fácil conversão para canvas/DataURL
 */

import qrcode from "qrcode-generator";

export type QrLogoConfig = {
  /** URL ou Data URL da imagem do logo (PNG com fundo transparente) */
  logoDataUrl?: string;
  /** Tamanho do logo em percentual (10-30%, padrão 20%) */
  logoSizePercent?: number;
  /** Nível de correção de erro: "L", "M", "Q", "H" */
  errorCorrection?: "L" | "M" | "Q" | "H";
};

/**
 * Gera QR Code como HTMLCanvasElement.
 * If logoDataUrl is provided, overlay logo no centro.
 */
export async function generateQrCanvasWithLogo(
  data: string,
  size: number,
  config: QrLogoConfig = {}
): Promise<HTMLCanvasElement> {
  const logoPercent = Math.min(30, Math.max(10, config.logoSizePercent ?? 20));

  // Gera QR com máximo nível de correção para suportar logo
  const qr = qrcode(0, "H");
  qr.addData(data);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const moduleSize = size / Math.max(1, moduleCount);

  // Canvas para o QR
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D context from canvas");

  // Fundo branco
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, size, size);

  // Desenha módulos do QR (preto)
  ctx.fillStyle = "#000000";
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (!qr.isDark(r, c)) continue;
      const x = c * moduleSize;
      const y = r * moduleSize;
      ctx.fillRect(x, y, moduleSize, moduleSize);
    }
  }

  // Se tem logo, renderiza no centro
  if (config.logoDataUrl) {
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => reject(new Error("Failed to load logo image"));
        logoImg.src = config.logoDataUrl!;
      });

      // Calcula tamanho e posição do logo
      const logoDimension = (size * logoPercent) / 100;
      const logoX = (size - logoDimension) / 2;
      const logoY = (size - logoDimension) / 2;

      // Fundo branco opaco para logo (garante legibilidade)
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(logoX - 2, logoY - 2, logoDimension + 4, logoDimension + 4);

      // Desenha logo no centro
      ctx.drawImage(logoImg, logoX, logoY, logoDimension, logoDimension);
    } catch (err) {
      // Se logo falhar, apenas retorna QR sem logo
      console.warn("[qrcodeLogoService] Failed to render logo:", err);
    }
  }

  return canvas;
}

/**
 * Gera QR Code como Data URL (PNG).
 * Se logoDataUrl is provided, overlay logo no centro.
 */
export async function generateQrDataUrlWithLogo(
  data: string,
  size: number,
  config: QrLogoConfig = {}
): Promise<string> {
  const canvas = await generateQrCanvasWithLogo(data, size, config);
  return canvas.toDataURL("image/png");
}

/**
 * Gera QR simples (sem logo) como canvas.
 * Útil para fallback ou uso sem logo.
 */
export function generateQrCanvas(data: string, size: number): HTMLCanvasElement {
  const qr = qrcode(0, "H");
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

  return canvas;
}

/**
 * Converte base64 para Data URL se necessário.
 * Se já for Data URL, retorna como está.
 */
export function ensureDataUrl(input: string): string {
  if (input.startsWith("data:")) {
    return input;
  }
  // Assume PNG se não especificado
  return `data:image/png;base64,${input}`;
}

/**
 * Valida se Data URL é imagem suportada.
 */
export function isValidImageDataUrl(dataUrl: unknown): boolean {
  if (typeof dataUrl !== "string") return false;
  return /^data:image\/(png|jpg|jpeg|gif|webp);base64,.+/.test(dataUrl);
}
