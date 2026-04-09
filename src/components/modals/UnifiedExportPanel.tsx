/**
 * Painel unificado: Gerar Arquivo + Enviar Projeto + Salvar e Gerar Design.
 * Uma instância de useSendProjectPackage partilhada entre o formulário de envio e o botão final.
 */

import type { CSSProperties } from "react";
import { useProject } from "../../context/useProject";
import { useGerarArquivoHandlers } from "../../hooks/useGerarArquivoHandlers";
import { useSendProjectPackage } from "../../hooks/useSendProjectPackage";
import { Icon } from "@/components/icons";
import SendProjectPackageForm from "./SendProjectPackageForm";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

/** Wrapper obrigatório 20×20 para ícones dentro de botões. */
const iconWrap: CSSProperties = {
  width: 20,
  height: 20,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

/** Reserva 20×20 em botões sem ícone (alinhamento com botões com ícone). */
const iconSlotEmpty: CSSProperties = {
  width: 20,
  height: 20,
  flexShrink: 0,
};

const cardStyle: CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  padding: 12,
  marginBottom: 10,
};

const cardTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  margin: "0 0 8px",
};

const exportGridBtnStyle: CSSProperties = {
  width: "100%",
  height: 32,
  padding: "8px 12px",
  borderRadius: 6,
  fontSize: 13,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  boxSizing: "border-box",
};

const finalBtnStyle: CSSProperties = {
  width: "100%",
  height: 40,
  borderRadius: 8,
  fontSize: 13,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  background: "var(--blue-light)",
  boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
  boxSizing: "border-box",
};

export default function UnifiedExportPanel({ isOpen, onClose }: Props) {
  const { project, actions } = useProject();
  const sendPackage = useSendProjectPackage();
  const {
    hasBoxes,
    onCutlist,
    onPdfTecnico,
    onUnificado,
    onAmbos,
    onLayoutCortePro,
    onArquivoCompleto,
  } = useGerarArquivoHandlers();

  const wrap = (fn: () => void) => () => {
    fn();
    onClose();
  };

  const handleSalvarEGerarEEnviar = async () => {
    await actions.gerarESalvarDesign();
    await Promise.resolve(sendPackage.buildSendPackage());
    await Promise.resolve(sendPackage.handleSendPackage());
    /* (d) downloadSendPackage: quando sendMethod === "download", handleSendPackage já chama
       downloadSendPackage no hook; repetir (d) duplicaria o JSON. Outros métodos: integração, sem download. */
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Salvar e gerar design, exportar e enviar"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal-card"
        style={{ maxWidth: 560, maxHeight: "90vh", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">Salvar e Gerar Design</div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="unified-export-panel" style={{ padding: "16px" }}>
          <div style={cardStyle}>
            <div style={cardTitleStyle}>Gerar Arquivo</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 8,
              }}
            >
              <button
                type="button"
                className="modal-action"
                style={exportGridBtnStyle}
                onClick={wrap(onPdfTecnico)}
                disabled={!hasBoxes}
              >
                <span style={iconSlotEmpty} aria-hidden />
                <span style={{ lineHeight: 1.1, textAlign: "center" }}>Gerar PDF Técnico</span>
              </button>
              <button
                type="button"
                className="modal-action"
                style={exportGridBtnStyle}
                onClick={wrap(onCutlist)}
                disabled={!hasBoxes}
              >
                <span style={iconSlotEmpty} aria-hidden />
                <span style={{ lineHeight: 1.1, textAlign: "center" }}>Gerar Cutlist</span>
              </button>
              <button
                type="button"
                className="modal-action"
                style={exportGridBtnStyle}
                onClick={wrap(onUnificado)}
                disabled={!hasBoxes}
              >
                <span style={iconSlotEmpty} aria-hidden />
                <span style={{ lineHeight: 1.1, textAlign: "center" }}>Gerar Arquivo Unificado (NOVO)</span>
              </button>
              <button
                type="button"
                className="modal-action"
                style={exportGridBtnStyle}
                onClick={wrap(onAmbos)}
                disabled={!hasBoxes}
              >
                <span style={iconSlotEmpty} aria-hidden />
                <span style={{ lineHeight: 1.1, textAlign: "center" }}>
                  Ambos (Cutlist + PDF Técnico + Arquivo Unificado)
                </span>
              </button>
              <button
                type="button"
                className="modal-action"
                style={exportGridBtnStyle}
                onClick={wrap(onLayoutCortePro)}
                disabled={!hasBoxes}
              >
                <span style={iconWrap} aria-hidden>
                  <Icon name="blueprint" size={20} aria-hidden />
                </span>
                <span style={{ lineHeight: 1.1, textAlign: "center" }}>Layout de Corte PRO</span>
              </button>
              <button
                type="button"
                className="modal-action"
                style={{ ...exportGridBtnStyle, fontWeight: 600 }}
                onClick={wrap(onArquivoCompleto)}
                disabled={!hasBoxes}
              >
                <span style={iconSlotEmpty} aria-hidden />
                <span style={{ lineHeight: 1.1, textAlign: "center" }}>Gerar arquivo completo</span>
              </button>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={cardTitleStyle}>Enviar Projeto</div>
            <SendProjectPackageForm hookApi={sendPackage} showPrepareButton={false} unifiedPanelLayout />
          </div>

          <div style={{ ...cardStyle, marginBottom: 0 }}>
            <button
              type="button"
              className="button button-primary"
              style={finalBtnStyle}
              onClick={() => void handleSalvarEGerarEEnviar()}
              disabled={project.estaCarregando}
            >
              <span style={iconWrap} aria-hidden>
                <Icon name="adminSave" size={20} aria-hidden />
              </span>
              <span style={{ lineHeight: 1.1 }}>Salvar e Gerar Design</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
