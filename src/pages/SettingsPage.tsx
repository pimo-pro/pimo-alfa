import { useState } from "react";
import SystemSettingsBase from "../components/admin/SystemSettingsBase";
import DeployAdminPage from "../components/admin/DeployAdminPage";
import Panel from "../components/ui/Panel";

export default function SettingsPage() {
  const [showDeployExperimental, setShowDeployExperimental] = useState(false);

  return (
    <main
      style={{
        flex: 1,
        overflowY: "auto",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: "radial-gradient(circle at top, var(--blue-dark), var(--black) 60%)",
      }}
    >
      <Panel
        title="Configurações"
        description="Módulo central de configurações globais do sistema."
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Use esta página para defaults globais. Sem alterar lógica de negócio.
          </span>
          <button
            type="button"
            className="button button-ghost"
            onClick={() => setShowDeployExperimental((value) => !value)}
          >
            {showDeployExperimental ? "Ocultar Deploy Experimental" : "Mostrar Deploy Experimental"}
          </button>
        </div>
      </Panel>

      <SystemSettingsBase />

      {showDeployExperimental ? (
        <Panel title="Deploy (Experimental)" description="Painel local de diagnóstico e histórico simulado de deploy.">
          <DeployAdminPage />
        </Panel>
      ) : null}
    </main>
  );
}
