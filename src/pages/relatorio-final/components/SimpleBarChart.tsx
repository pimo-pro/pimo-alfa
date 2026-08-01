import { buildChartMetrics, type ProjectReportMetricas } from "@/core/projectReport";

type Props = {
  metricas: ProjectReportMetricas;
};

export default function SimpleBarChart({ metricas }: Props) {
  const items = buildChartMetrics(metricas);
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
          minHeight: 140,
          padding: "8px 4px 0",
        }}
      >
        {items.map((item) => {
          const h = Math.max(4, Math.round((item.value / max) * 120));
          return (
            <div key={item.key} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{item.value}</div>
              <div
                title={`${item.label}: ${item.value}`}
                style={{
                  height: h,
                  background: item.color,
                  borderRadius: "6px 6px 2px 2px",
                  margin: "0 auto",
                  width: "70%",
                  minWidth: 18,
                  maxWidth: 48,
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 6,
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        {items.map((item) => (
          <div key={`leg-${item.key}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: item.color,
                flexShrink: 0,
              }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
