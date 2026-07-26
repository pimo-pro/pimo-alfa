/**
 * enforceCutlistIdentity.ts — Cutlist com nomes/códigos SSOT.
 */

import type { DrawerCutlistItem } from "../types";
import { enforceNaming, inferDrawerIndexFromCodigo } from "./enforceNaming";
import { isCanonicalEuropeanCode } from "./namingMap";

function inferIndexFromId(id: string): number | undefined {
  const m = /-(\d+)$/.exec(id);
  if (!m) return undefined;
  return Math.max(0, Number(m[1]) - 1);
}

/**
 * Corrige nome/código/label industriais sem alterar dims/materiais.
 */
export function enforceCutlistIdentity(
  items: DrawerCutlistItem[],
  options?: { drawerCount?: number }
): DrawerCutlistItem[] {
  const drawerCount = Math.max(1, options?.drawerCount ?? 1);
  return items.map((item) => {
    // Hardware / opcional sem mapa madeira — preservar
    if (item.kind === "hardware" || item.kind === "metal") return item;
    if (item.tipo === "soft_close" || item.tipo === "push_open" || item.tipo === "corredica") {
      return item;
    }

    const drawerIndex0 =
      inferDrawerIndexFromCodigo(item.codigo) ??
      inferIndexFromId(item.id) ??
      0;

    const id = enforceNaming({
      nome: item.nome,
      codigo: item.codigo,
      tipo: item.tipo,
      drawerIndex0,
      drawerCount,
    });
    if (!id) return item;

    const industrialLabel =
      item.industrialLabel && item.industrialLabel.includes(id.codigo)
        ? item.industrialLabel
        : item.industrialLabel
          ? item.industrialLabel.replace(/gav[_a-z0-9]+/i, id.codigo)
          : id.codigo;

    // Garantir que o label contém o código canúnico
    let label = industrialLabel;
    if (!isCanonicalEuropeanCode(id.codigo) || !String(label).includes(id.codigo)) {
      label = id.codigo;
    }

    return {
      ...item,
      nome: id.nome,
      codigo: id.codigo,
      industrialLabel: label,
      // tipo interno pipeline mantém-se para drillingService; código SSOT em codigo
    };
  });
}
