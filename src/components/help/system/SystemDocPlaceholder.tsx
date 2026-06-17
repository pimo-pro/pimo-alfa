import { HELP_DOC_THEME as T } from "../helpDocTheme";

type PlaceholderProps = {
  title: string;
  description: string;
};

export default function SystemDocPlaceholder({ title, description }: PlaceholderProps) {
  return (
    <div
      style={{
        padding: 32,
        border: `1px dashed ${T.border}`,
        borderRadius: 12,
        background: "rgba(255,255,255,0.02)",
        textAlign: "center",
      }}
    >
      <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: T.text }}>{title}</p>
      <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>{description}</p>
      <p style={{ margin: "16px 0 0", fontSize: 11, color: T.amber }}>Placeholder — documentação em preparação.</p>
    </div>
  );
}
