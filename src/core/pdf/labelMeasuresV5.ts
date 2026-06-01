/**
 * Formatação de medidas para etiquetas v5 (vírgula decimal, sem zeros finais).
 * Alinhado a PIMO_LABEL_DESIGN_PREVIEW.
 */

const MAX_DECIMALS = 6;

function numberToTrimmedDecimalString(value: number): string {
  let s = value.toString();
  if (s.includes("e") || s.includes("E")) {
    s = value.toFixed(MAX_DECIMALS);
  } else {
    const dot = s.indexOf(".");
    if (dot >= 0) {
      const frac = s.slice(dot + 1);
      if (frac.length > MAX_DECIMALS) {
        s = value.toFixed(MAX_DECIMALS);
      }
    }
  }
  s = s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return s;
}

export function formatNumberV5(value: number): string {
  if (!Number.isFinite(value)) return "0";

  const normalized = Object.is(value, -0) ? 0 : value;
  const s = numberToTrimmedDecimalString(normalized);
  const [intPart, decPart = ""] = s.split(".");
  const trimmedDec = decPart.replace(/0+$/, "");
  if (!trimmedDec) return intPart;
  return `${intPart},${trimmedDec}`;
}

export function formatDimensionV5(
  widthMm: number,
  heightMm: number,
  thicknessMm?: number
): string {
  const w = formatNumberV5(widthMm);
  const h = formatNumberV5(heightMm);
  if (thicknessMm != null && thicknessMm > 0) {
    return `${w}×${h}×${formatNumberV5(thicknessMm)} MM`;
  }
  return `${w}×${h} MM`;
}
