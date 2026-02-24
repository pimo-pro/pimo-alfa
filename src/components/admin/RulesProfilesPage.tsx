/**
 * Página de gestão de Perfis de Regras.
 * Listar, selecionar, criar, duplicar, editar e remover perfis.
 */

import { useState } from "react";
import { useProject } from "../../context/useProject";
import { DEFAULT_PROFILE_ID, resetProfiles } from "../../core/rules/rulesProfilesStorage";
import type { RulesProfile } from "../../core/rules/rulesProfiles";
import Panel from "../ui/Panel";
import { useToast } from "../../context/ToastContext";

export default function RulesProfilesPage() {
  const { showToast } = useToast();
  const { project, actions } = useProject();
  const { rulesProfiles } = project;
  const { perfis, perfilAtivoId } = rulesProfiles;
  const perfilAtivo = perfis.find((p) => p.id === perfilAtivoId);
  const [newProfileName, setNewProfileName] = useState("");
  const [duplicateNameById, setDuplicateNameById] = useState<Record<string, string>>({});
  const [confirmResetProfilesOpen, setConfirmResetProfilesOpen] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  const handleSetActive = (id: string) => {
    actions.setActiveRulesProfile(id);
  };

  const handleAddProfile = () => {
    const nome = newProfileName.trim();
    if (!nome) {
      showToast("Defina o nome do novo perfil.", "warning");
      return;
    }
    actions.addRulesProfile({ nome });
    setNewProfileName("");
    showToast("Perfil criado com sucesso.", "info");
  };

  const handleDuplicate = (profile: RulesProfile) => {
    const nome = (duplicateNameById[profile.id] ?? `${profile.nome} (cópia)`).trim();
    if (!nome) {
      showToast("Defina o nome da cópia.", "warning");
      return;
    }
    actions.addRulesProfile({
      nome,
      descricao: profile.descricao,
      rules: JSON.parse(JSON.stringify(profile.rules)),
    });
    setDuplicateNameById((prev) => ({ ...prev, [profile.id]: `${profile.nome} (cópia)` }));
    showToast("Perfil duplicado com sucesso.", "info");
  };

  const handleResetProfiles = () => {
    if (!confirmResetProfilesOpen) return;
    const config = resetProfiles();
    actions.setRulesProfilesConfig(config);
    setConfirmResetProfilesOpen(false);
    showToast("Perfis repostos para os valores padrão.", "info");
  };

  const handleRemove = (id: string) => {
    if (id === DEFAULT_PROFILE_ID) {
      showToast("O perfil Padrão não pode ser removido.", "warning");
      return;
    }
    if (pendingRemoveId !== id) {
      setPendingRemoveId(id);
      return;
    }
    actions.removeRulesProfile(id);
    setPendingRemoveId(null);
    showToast("Perfil removido com sucesso.", "info");
  };

  return (
    <div style={{ padding: 24, overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Perfis de Regras</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setConfirmResetProfilesOpen(true)} className="button button-ghost">
            Repor Defaults
          </button>
          <button type="button" onClick={handleAddProfile} className="button button-primary">
            + Novo Perfil
          </button>
        </div>
      </div>

      <Panel title="Criar novo perfil">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            className="input"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            placeholder="Nome do novo perfil"
            style={{ minWidth: 220 }}
          />
          <button type="button" className="button" onClick={handleAddProfile}>
            Criar perfil
          </button>
        </div>
      </Panel>

      {confirmResetProfilesOpen && (
        <Panel title="Confirmar reposição">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Repor todos os perfis para os valores padrão? Os perfis personalizados serão perdidos.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="button" onClick={handleResetProfiles}>
                Confirmar
              </button>
              <button type="button" className="button button-ghost" onClick={() => setConfirmResetProfilesOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </Panel>
      )}

      <Panel
        title="Perfil ativo"
        description="As regras do perfil ativo são aplicadas em todo o projeto. Edite em Configuração de Regras."
      >
        <div style={{ fontSize: 14, color: "var(--text-main)" }}>
          {perfilAtivo ? (
            <strong>{perfilAtivo.nome}</strong>
          ) : (
            <span style={{ color: "var(--text-muted)" }}>Nenhum perfil ativo</span>
          )}
        </div>
      </Panel>

      <Panel title="Lista de perfis" description="Selecione o perfil ativo, duplique ou remova.">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {perfis.map((p: RulesProfile) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                background: p.id === perfilAtivoId ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${p.id === perfilAtivoId ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: "var(--radius)",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>{p.nome}</div>
                {p.descricao && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{p.descricao}</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {p.id !== perfilAtivoId && (
                  <button
                    type="button"
                    onClick={() => handleSetActive(p.id)}
                    className="button button-ghost"
                    style={{ padding: "6px 10px", fontSize: 12 }}
                  >
                    Ativar
                  </button>
                )}
                {p.id === perfilAtivoId && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)", padding: "4px 8px" }}>Ativo</span>
                )}
                <button
                  type="button"
                  onClick={() => handleDuplicate(p)}
                  className="button button-ghost"
                  style={{ padding: "6px 10px", fontSize: 12 }}
                >
                  Duplicar
                </button>
                <input
                  className="input"
                  value={duplicateNameById[p.id] ?? `${p.nome} (cópia)`}
                  onChange={(e) =>
                    setDuplicateNameById((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                  style={{ width: 170, fontSize: 11, padding: "4px 8px" }}
                  placeholder="Nome da cópia"
                />
                {p.id !== DEFAULT_PROFILE_ID && (
                  <button
                    type="button"
                    onClick={() => handleRemove(p.id)}
                    className="button button-ghost"
                    style={{ padding: "6px 10px", fontSize: 12, color: "var(--red)" }}
                  >
                    {pendingRemoveId === p.id ? "Confirmar remoção" : "Remover"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-muted)" }}>
        Para editar as regras do perfil ativo, use a secção <strong>Configuração de Regras</strong> no menu.
      </div>
    </div>
  );
}
