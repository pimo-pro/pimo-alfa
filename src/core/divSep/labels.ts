/** Nome industrial: BOXNAME_DIV_01, BOXNAME_SEP_02 */
export function buildDivSepIndustrialLabel(
  boxName: string,
  kind: "DIV" | "SEP",
  index1Based: number
): string {
  const safeName = String(boxName || "BOX")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\-]/g, "")
    .slice(0, 32) || "BOX";
  const num = String(Math.max(1, index1Based)).padStart(2, "0");
  return `${safeName}_${kind}_${num}`;
}
