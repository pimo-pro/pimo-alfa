import { useEffect, useRef } from "react";
import type { ProjectTag } from "../../hooks/useProjectsUIOverlay";

type TagOption = {
  value: ProjectTag;
  color: string;
  label: string;
};

const TAG_OPTIONS: TagOption[] = [
  { value: "ready", color: "#22c55e", label: "Pronto para produção" },
  { value: "review", color: "#f59e0b", label: "Precisa revisão" },
  { value: "error", color: "#ef4444", label: "Erro" },
  { value: "sent", color: "#3b82f6", label: "Enviado para produção" },
  { value: null, color: "transparent", label: "Sem estado" },
];

type Props = {
  current: ProjectTag;
  onSelect: (_tag: ProjectTag) => void;
  onClose: () => void;
  anchorRect: DOMRect;
};

export function TagPicker({ current, onSelect, onClose, anchorRect }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const top = anchorRect.bottom + window.scrollY + 6;
  const left = anchorRect.left + window.scrollX;

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Selecionar estado do projeto"
      style={{
        position: "absolute",
        top,
        left,
        zIndex: 10000,
        background: "var(--ui-color-bg, #fff)",
        border: "1px solid var(--border, #e4e4e7)",
        borderRadius: 10,
        boxShadow: "0 4px 20px rgba(0,0,0,0.14)",
        padding: "6px 0",
        minWidth: 200,
      }}
    >
      {TAG_OPTIONS.map((opt) => (
        <button
          key={opt.value ?? "__none__"}
          type="button"
          role="menuitem"
          onClick={() => {
            onSelect(opt.value);
            onClose();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "7px 14px",
            background:
              current === opt.value
                ? "var(--ui-color-surface, #f4f4f5)"
                : "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            color: "var(--ui-color-text, #18181b)",
            textAlign: "left",
            transition: "background 0.1s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--ui-color-surface, #f4f4f5)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              current === opt.value
                ? "var(--ui-color-surface, #f4f4f5)"
                : "transparent";
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: opt.color,
              border:
                opt.value === null
                  ? "1.5px solid var(--ui-color-muted, #a1a1aa)"
                  : "none",
              flexShrink: 0,
            }}
          />
          <span>{opt.label}</span>
          {current === opt.value && (
            <span
              aria-hidden
              style={{
                marginLeft: "auto",
                fontSize: 12,
                color: "var(--ui-color-muted, #71717a)",
              }}
            >
              ✓
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
