/**
 * Jump-to-cell para histórico industrial (Fase 3).
 */

import type { IndustrialHistoryFocus } from "./industrialDocumentHistoryTypes";

const HIGHLIGHT_CLASS = "pimo-analise-jump-highlight";
const HIGHLIGHT_MS = 2800;

let styleInjected = false;

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function ensureJumpStyle() {
  if (styleInjected || typeof document === "undefined") return;
  styleInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      outline: 2px solid #2563eb !important;
      outline-offset: 1px;
      box-shadow: inset 0 0 0 2px rgba(37, 99, 235, 0.35);
      transition: outline 0.15s ease, box-shadow 0.15s ease;
    }
  `;
  document.head.appendChild(style);
}

export function jumpToIndustrialHistoryCell(focus: IndustrialHistoryFocus): {
  ok: boolean;
  reason?: string;
} {
  if (typeof document === "undefined") return { ok: false, reason: "no-dom" };
  ensureJumpStyle();

  let el: HTMLElement | null = null;
  if (focus.cellDomId) {
    el = document.getElementById(focus.cellDomId);
  }
  if (!el && focus.fieldKey && focus.fieldKey !== "__row__") {
    el = document.querySelector<HTMLElement>(
      `[data-row-id="${cssEscape(focus.rowId)}"][data-field="${cssEscape(focus.fieldKey)}"]`
    );
  }
  if (!el) {
    el = document.querySelector<HTMLElement>(`[data-row-id="${cssEscape(focus.rowId)}"]`);
  }
  if (!el) {
    return { ok: false, reason: "not-found" };
  }

  el.scrollIntoView({ block: "center", behavior: "smooth" });
  el.classList.add(HIGHLIGHT_CLASS);
  window.setTimeout(() => {
    el?.classList.remove(HIGHLIGHT_CLASS);
  }, HIGHLIGHT_MS);
  return { ok: true };
}
