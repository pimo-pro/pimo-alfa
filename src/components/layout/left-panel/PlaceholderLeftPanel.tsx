export type PlaceholderLeftPanelProps = {
  title: string;
  description: string;
};

export function PlaceholderLeftPanel({ title, description }: PlaceholderLeftPanelProps) {
  return (
    <div className="left-panel-content">
      <div className="left-panel-scroll">
        <aside className="panel-content panel-content--side">
          <div className="design-panel-header">
            <div className="section-title">{title}</div>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
            {description}
          </p>
        </aside>
      </div>
    </div>
  );
}
