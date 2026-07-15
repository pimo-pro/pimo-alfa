/**
 * Popover unificado para steppers, contadores e ações rápidas.
 * Usado em Prateleiras, Porta, Gaveta e outros controles.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type UnifiedPopoverProps = {
  /** Conteúdo do trigger (ex: botão ou label) */
  trigger: React.ReactNode;
  /** Conteúdo do popover */
  children: React.ReactNode;
  /** Alinhamento: "start" | "center" | "end" */
  align?: "start" | "center" | "end";
  /** ID para acessibilidade */
  id?: string;
  /** Classe CSS do container do trigger */
  className?: string;
  /** Botão trigger em largura total (ex.: painel lateral). */
  fullWidth?: boolean;
  /** Estilo do botão trigger: inline (padrão), primary ou ghost (painel lateral). */
  triggerVariant?: "inline" | "primary" | "ghost";
  /** Tooltip nativo ao hover no botão trigger. */
  triggerTitle?: string;
  /** inline: painel expande abaixo do botão (empurra conteúdo); overlay: posição absoluta (padrão). */
  layout?: "inline" | "overlay";
  /** Modo controlado (ex.: accordion exclusivo no painel da caixa). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function UnifiedPopover({
  trigger,
  children,
  align = "start",
  id,
  className,
  fullWidth = false,
  triggerVariant = "inline",
  triggerTitle,
  layout = "overlay",
  open: openControlled,
  onOpenChange,
}: UnifiedPopoverProps) {
  const [openUncontrolled, setOpenUncontrolled] = useState(false);
  const isControlled = openControlled !== undefined;
  const open = isControlled ? openControlled : openUncontrolled;
  const containerRef = useRef<HTMLDivElement>(null);

  const setOpen = useCallback(
    (next: boolean) => {
      if (isControlled) onOpenChange?.(next);
      else setOpenUncontrolled(next);
    },
    [isControlled, onOpenChange],
  );

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    },
    [setOpen],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, handleClickOutside]);

  const isPrimaryTrigger = triggerVariant === "primary";
  const isGhostTrigger = triggerVariant === "ghost";
  const isPanelTrigger = isPrimaryTrigger || isGhostTrigger;
  const isInline = layout === "inline";

  return (
    <div
      ref={containerRef}
      style={{
        position: isInline ? "static" : "relative",
        display: fullWidth ? "block" : "inline-block",
        width: fullWidth ? "100%" : undefined,
      }}
      className={className}
    >
      <button
        type="button"
        id={id}
        aria-haspopup="true"
        aria-expanded={open}
        title={triggerTitle}
        aria-label={triggerTitle}
        onClick={() => setOpen(!open)}
        className={
          isPrimaryTrigger
            ? "button button-primary"
            : isGhostTrigger
              ? "button button-ghost"
              : undefined
        }
        style={
          isPanelTrigger
            ? {
                width: fullWidth ? "100%" : undefined,
                ...(open && isGhostTrigger
                  ? {
                      borderColor: "var(--accent, #38bdf8)",
                      background: "rgba(56, 189, 248, 0.12)",
                      boxShadow: "inset 0 0 0 1px var(--accent, #38bdf8)",
                    }
                  : open && isPrimaryTrigger
                    ? {
                        boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.35)",
                      }
                    : {}),
              }
            : {
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                color: "var(--text-main)",
                padding: "6px 10px",
                fontSize: 12,
                cursor: "pointer",
              }
        }
      >
        {trigger}
      </button>
      {open && (
        <div
          role="dialog"
          aria-labelledby={id}
          style={
            isInline
              ? {
                  position: "static",
                  marginTop: 4,
                  padding: 12,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  width: "100%",
                  boxSizing: "border-box",
                }
              : {
                  position: "absolute",
                  top: "100%",
                  left: align === "start" ? 0 : align === "end" ? "auto" : "50%",
                  right: align === "end" ? 0 : undefined,
                  transform: align === "center" ? "translateX(-50%)" : undefined,
                  marginTop: 4,
                  padding: 12,
                  background: "var(--navy, #0f172a)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  zIndex: 1000,
                  minWidth: 160,
                  width: fullWidth ? "100%" : undefined,
                  boxSizing: "border-box",
                }
          }
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** Stepper para quantidade (prateleiras, gavetas, etc.) */
export function StepperPopover({
  label,
  value,
  min = 0,
  max = 99,
  onChange,
  id,
  fullWidth,
  triggerVariant,
  triggerTitle,
  layout,
  open,
  onOpenChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (_v: number) => void;
  id?: string;
  fullWidth?: boolean;
  triggerVariant?: "inline" | "primary" | "ghost";
  triggerTitle?: string;
  layout?: "inline" | "overlay";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const v = Math.max(min, Math.min(max, Math.floor(value)));
  const separator = triggerVariant && triggerVariant !== "inline" ? " — " : ": ";
  return (
    <UnifiedPopover
      id={id}
      fullWidth={fullWidth}
      triggerVariant={triggerVariant}
      triggerTitle={triggerTitle}
      layout={layout}
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        <span>
          {label}{separator}<strong>{v}</strong>
        </span>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => onChange(Math.max(min, v - 1))}
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-main)",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            −
          </button>
          <span style={{ minWidth: 28, textAlign: "center", fontWeight: 600 }}>{v}</span>
          <button
            type="button"
            onClick={() => onChange(Math.min(max, v + 1))}
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-main)",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            +
          </button>
        </div>
      </div>
    </UnifiedPopover>
  );
}
