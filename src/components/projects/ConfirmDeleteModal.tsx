import { useEffect } from "react";
import Button from "../ui/Button";

type Props = {
  projectNames: string[];
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDeleteModal({ projectNames, onConfirm, onCancel }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  const count = projectNames.length;
  const plural = count === 1 ? "projeto" : "projetos";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(3px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          background: "var(--ui-color-bg, #fff)",
          border: "1px solid var(--border, #e4e4e7)",
          borderRadius: 14,
          padding: "28px 32px",
          width: "min(480px, calc(100vw - 32px))",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2
            id="confirm-delete-title"
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              color: "var(--ui-color-danger, #ef4444)",
            }}
          >
            Eliminar {count} {plural}?
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ui-color-muted, #71717a)" }}>
            Esta ação não pode ser desfeita. Os projetos serão removidos permanentemente.
          </p>
        </div>

        {projectNames.length > 0 && (
          <ul
            style={{
              margin: 0,
              padding: "0 0 0 16px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              maxHeight: 180,
              overflowY: "auto",
            }}
          >
            {projectNames.map((name, i) => (
              <li
                key={i}
                style={{
                  fontSize: 13,
                  color: "var(--ui-color-text, #18181b)",
                  fontWeight: 500,
                }}
              >
                {name}
              </li>
            ))}
          </ul>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            style={{ minWidth: 80 }}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            style={{ minWidth: 120 }}
          >
            Eliminar {count} {plural}
          </Button>
        </div>
      </div>
    </div>
  );
}
