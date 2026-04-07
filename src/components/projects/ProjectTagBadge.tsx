import type { ProjectTag } from "../../hooks/useProjectsUIOverlay";

const TAG_CONFIG: Record<
  NonNullable<ProjectTag>,
  { color: string; label: string }
> = {
  ready: { color: "#22c55e", label: "Pronto para produção" },
  review: { color: "#f59e0b", label: "Precisa revisão" },
  error: { color: "#ef4444", label: "Erro" },
  sent: { color: "#3b82f6", label: "Enviado para produção" },
};

type Props = {
  tag: ProjectTag;
  onClick?: (_e: React.MouseEvent) => void;
};

export function ProjectTagBadge({ tag, onClick }: Props) {
  const config = tag ? TAG_CONFIG[tag] : null;

  return (
    <button
      type="button"
      onClick={onClick}
      title={config ? config.label : "Definir estado"}
      aria-label={config ? config.label : "Definir estado do projeto"}
      style={{
        width: 14,
        height: 14,
        borderRadius: "50%",
        border: `2px solid ${config ? config.color : "var(--ui-color-muted, #a1a1aa)"}`,
        background: config ? config.color : "transparent",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
        transition: "transform 0.12s, box-shadow 0.12s",
        boxShadow: config ? `0 0 0 3px ${config.color}33` : "none",
      }}
      onMouseEnter={(_e) => {
        (_e.currentTarget as HTMLButtonElement).style.transform = "scale(1.3)";
      }}
      onMouseLeave={(_e) => {
        (_e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
    />
  );
}
