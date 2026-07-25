import fs from "node:fs";

const p = "src/pages/documentacao/HubDashboardContent.tsx";
let t = fs.readFileSync(p, "utf8");
const old = `{graph.kind === "timeline" || graph.kind === "line" ? (
        <LineChart series={graph.series} />
      ) : graph.kind === "bars" ? (
        <BarChart bars={graph.bars} max={graph.max} />
      ) : (
        <DonutChart slices={graph.slices} />
      )}`;
const neu = `{graph.kind === "donut" ? (
        <DonutChart slices={graph.slices} />
      ) : graph.kind === "bars" ? (
        <BarChart bars={graph.bars} max={graph.max} />
      ) : (
        <LineChart series={graph.series} />
      )}`;
if (!t.includes(old)) {
  console.error("pattern missing");
  process.exit(1);
}
fs.writeFileSync(p, t.replace(old, neu), "utf8");
console.log("GraphCard narrowing fixed");
