import { Link, useLocation } from "react-router-dom";

import { INDUSTRIAL_STATIONS, STATION_LABELS } from "@/industrial/work-orders/types";
import { industrialBtnStyle } from "@/industrial/ui/layouts/industrialStyles";

function StationIcon({ label }: { label: string }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" }}>
      {label.slice(0, 3)}
    </span>
  );
}

export default function NestingV3StationSidebar() {
  const location = useLocation();
  const onNestingV3 = location.pathname === "/nesting_v3";

  return (
    <nav
      style={{
        display: "grid",
        gap: 8,
        justifyItems: "center",
        alignContent: "start",
      }}
      aria-label="Navegação industrial"
    >
      <Link
        to="/nesting_v3"
        title="Layout de Corte MANUAL (Nesting V3)"
        style={{
          ...industrialBtnStyle(onNestingV3),
          width: 40,
          height: 40,
          display: "grid",
          placeItems: "center",
          textDecoration: "none",
          padding: 0,
        }}
      >
        <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: 0.2 }}>V3</span>
      </Link>

      <div style={{ height: 1, width: "100%", background: "var(--border, #334155)", margin: "4px 0" }} />

      {INDUSTRIAL_STATIONS.map((station) => {
        const path = `/industrial/work-orders/${station}`;
        const active = !onNestingV3 && location.pathname === path;
        return (
          <Link
            key={station}
            to={path}
            title={STATION_LABELS[station]}
            style={{
              ...industrialBtnStyle(active),
              width: 40,
              height: 40,
              display: "grid",
              placeItems: "center",
              textDecoration: "none",
              padding: 0,
            }}
          >
            <StationIcon label={STATION_LABELS[station]} />
          </Link>
        );
      })}

      <div style={{ height: 1, width: "100%", background: "var(--border, #334155)", margin: "4px 0" }} />

      <Link
        to="/industrial"
        title="PIMO Industrial"
        style={{
          ...industrialBtnStyle(false),
          width: 40,
          height: 40,
          display: "grid",
          placeItems: "center",
          textDecoration: "none",
          padding: 0,
          fontSize: 10,
        }}
      >
        ⌂
      </Link>
      <Link
        to="/"
        title="Workspace criativo"
        style={{
          ...industrialBtnStyle(false),
          width: 40,
          height: 40,
          display: "grid",
          placeItems: "center",
          textDecoration: "none",
          padding: 0,
          fontSize: 10,
        }}
      >
        3D
      </Link>
    </nav>
  );
}
