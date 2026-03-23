export type FormatCurrencyOptions = {
  /** "suffix" = "12.34 €" (UI — padrão); "prefix" = "€ 12.34" (PDF) */
  placement?: "suffix" | "prefix";
  /** Casas decimais (default: 2) */
  decimals?: number;
  /** String quando value é null/undefined/NaN (default: "--") */
  empty?: string;
};

/**
 * Formata um valor numérico como moeda euro.
 * UI:  formatCurrency(12.5)                    → "12.50 €"
 * PDF: formatCurrency(12.5, {placement:"prefix"}) → "€ 12.50"
 * Null: formatCurrency(null)                   → "--"
 * PDF null: formatCurrency(null, {empty:"—"})  → "—"
 */
export function formatCurrency(
  value: number | null | undefined,
  options?: FormatCurrencyOptions
): string {
  const { placement = "suffix", decimals = 2, empty = "--" } = options ?? {};
  if (value == null || isNaN(value)) return empty;
  const formatted = value.toFixed(decimals);
  return placement === "prefix" ? `€ ${formatted}` : `${formatted} €`;
}
