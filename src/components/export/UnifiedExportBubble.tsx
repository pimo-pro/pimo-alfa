/**
 * Bolha unificada «Salvar e Gerar Design»: exportação + envio de pacote.
 * UI redesenhada; mesma orquestração que o painel legado (hooks existentes).
 */

import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";
import { useProject } from "../../context/useProject";
import { useGerarArquivoHandlers } from "../../hooks/useGerarArquivoHandlers";
import { wrapArquivoCompletoWithSgpi } from "../../industrial/sgpi/industrialExportBridge";
import {
  useSendProjectPackage,
  type SendSelections,
} from "../../hooks/useSendProjectPackage";
import Button from "../ui/Button";
import { ModalPortal } from "../ui/ModalPortal";
import { Icon } from "@/components/icons";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onOpenNestingV3?: () => void;
};

const iconSlot: CSSProperties = {
  width: 20,
  height: 20,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const sectionTitle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.3,
};

const sectionMeta: CSSProperties = {
  margin: "0 0 16px",
  fontSize: 12,
  lineHeight: 1.4,
  opacity: 0.88,
};

const divider: CSSProperties = {
  border: "none",
  borderTop: "1px solid rgba(255,255,255,0.14)",
  margin: "24px 0",
};

const sectionDivider: CSSProperties = {
  border: "none",
  borderTop: "2px solid rgba(255,255,255,0.18)",
  margin: "32px 0",
};

const checkboxRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minHeight: 36,
  cursor: "pointer",
  fontSize: 13,
};

function Icon20({ children }: { children: ReactNode }) {
  return <span style={iconSlot}>{children}</span>;
}

function ExportRow({
  label,
  onClick,
  disabled,
  icon,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  icon?: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      fullWidth
      disabled={disabled}
      onClick={onClick}
      style={{ minHeight: 72, padding: "10px 8px" }}
    >
      <span
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          width: "100%",
        }}
      >
        <Icon20>{icon ?? <span style={{ width: 18, height: 18 }} aria-hidden />}</Icon20>
        <span style={{ lineHeight: 1.2, textAlign: "center", fontSize: 11, fontWeight: 600 }}>{label}</span>
      </span>
    </Button>
  );
}

export default function UnifiedExportBubble({ isOpen, onClose, onOpenNestingV3 }: Props) {
  const { project, actions } = useProject();
  const sendPackage = useSendProjectPackage();
  const {
    sendMethod,
    setSendMethod,
    sendSelections,
    toggleSendSelection,
    photoCaptureUrl,
    downloadSendPackage,
    captureImageForSend,
  } = sendPackage;

  const {
    hasBoxes,
    onCutlist,
    onPdfTecnico,
    onUnificado,
    onAmbos,
    onLayoutCortePro,
    onArquivoCompleto,
    onEtiquetas,
    onArquivosCnc,
  } = useGerarArquivoHandlers();

  const [packageExpanded, setPackageExpanded] = useState(false);

  const onArquivoCompletoWithSgpi = useMemo(
    () =>
      wrapArquivoCompletoWithSgpi(
        {
          projectName: project.projectName,
          currentProjectId: project.currentProjectId,
        },
        onArquivoCompleto
      ),
    [project.projectName, project.currentProjectId, onArquivoCompleto]
  );

  const wrap = (fn: () => void) => () => {
    fn();
    onClose();
  };

  const handlePedirFabricacao = async () => {
    await actions.gerarESalvarDesign();
    actions.setReadyForProduction(true);
  };

  const handleDownloadPacote = () => {
    setSendMethod("download");
    downloadSendPackage();
  };

  const selectionKeys: [keyof SendSelections, string][] = [
    ["image", "Imagem renderizada"],
    ["viewerSnapshot", "Snapshot do Viewer (JSON)"],
    ["projectSnapshot", "Snapshot do Projeto (JSON)"],
    ["cutlist", "Cutlist"],
    ["ferragens", "Ferragens"],
    ["precos", "Preços"],
  ];

  if (!isOpen) return null;

  return (
    <ModalPortal>
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Salvar e gerar design, exportar e enviar"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal-card"
        style={{
          width: "min(100%, 960px)",
          maxWidth: 960,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">Salvar e Gerar Design</div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div
          className="unified-export-bubble"
          style={{
            padding: "24px",
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            boxSizing: "border-box",
          }}
        >
          {/* ── SECÇÃO 1: Gerar arquivo ── */}
          <div>
            <h3 style={sectionTitle}>Gerar arquivo</h3>
            <p style={sectionMeta}>Exportações a partir do estado atual do projeto.</p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <ExportRow
                label="PDF Técnico"
                onClick={wrap(onPdfTecnico)}
                disabled={!hasBoxes}
                icon={<Icon name="adminDocs" size={18} aria-hidden />}
              />
              <ExportRow
                label="Cutlist"
                onClick={wrap(onCutlist)}
                disabled={!hasBoxes}
                icon={<Icon name="adminChecklist" size={18} aria-hidden />}
              />
              <ExportRow
                label="Etiquetas (UEE v5)"
                onClick={wrap(onEtiquetas)}
                disabled={!hasBoxes}
                icon={<Icon name="adminTag" size={18} aria-hidden />}
              />
              <ExportRow
                label="Arquivo Unificado"
                onClick={wrap(onUnificado)}
                disabled={!hasBoxes}
                icon={<Icon name="adminFolder" size={18} aria-hidden />}
              />
              <ExportRow
                label="Cutlist + PDF + Unificado"
                onClick={wrap(onAmbos)}
                disabled={!hasBoxes}
                icon={<Icon name="adminArchive" size={18} aria-hidden />}
              />
              <ExportRow
                label="Layout de Corte PRO"
                onClick={wrap(onLayoutCortePro)}
                disabled={!hasBoxes}
                icon={<Icon name="blueprint" size={18} aria-hidden />}
              />
              <ExportRow
                label="Nesting V3 (Manual)"
                onClick={() => { onClose(); onOpenNestingV3?.(); }}
                disabled={!hasBoxes || !onOpenNestingV3}
                icon={<Icon name="grid" size={18} aria-hidden />}
              />
              <ExportRow
                label="Arquivos CNC"
                onClick={wrap(onArquivosCnc)}
                disabled={!hasBoxes}
                icon={<Icon name="adminTools" size={18} aria-hidden />}
              />
            </div>
          </div>

          <hr style={divider} />

          {/* ── SECÇÃO 2: Ações finais ── */}
          <div>
            <h3 style={{ ...sectionTitle, marginBottom: 16 }}>Ações finais</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <Button
                type="button"
                variant="primary"
                fullWidth
                disabled={project.estaCarregando}
                onClick={() => void handlePedirFabricacao()}
                style={{ background: "#22c55e", borderColor: "#16a34a", color: "#fff", minHeight: 56 }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center", width: "100%" }}>
                  <Icon name="send" size={16} aria-hidden />
                  Salvar e pedir orçamento
                </span>
              </Button>
              <Button
                type="button"
                variant="primary"
                fullWidth
                disabled={project.estaCarregando}
                onClick={handleDownloadPacote}
                style={{ minHeight: 56 }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center", width: "100%" }}>
                  <Icon name="adminSave" size={16} aria-hidden />
                  Download local (JSON)
                </span>
              </Button>
              <Button
                type="button"
                variant="primary"
                fullWidth
                disabled={project.estaCarregando}
                onClick={() => void wrap(onArquivoCompletoWithSgpi)()}
                style={{ minHeight: 56 }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center", width: "100%" }}>
                  <Icon name="adminFolder" size={16} aria-hidden />
                  Gerar arquivo completo
                </span>
              </Button>
            </div>
          </div>

          {/* ── Divisor de secção ── */}
          <hr style={sectionDivider} />

          {/* ── SECÇÃO 3: Enviar projeto ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h2 style={{ ...sectionTitle, marginBottom: 4 }}>Enviar projeto</h2>
              <p style={{ ...sectionMeta, marginBottom: 0 }}>
                Configure o pacote e o canal antes de guardar e enviar.
              </p>
            </div>

            <hr style={divider} />

            <div>
              <button
                type="button"
                onClick={() => setPackageExpanded((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  width: "100%",
                  marginBottom: 8,
                  color: "var(--text-main)",
                }}
                aria-expanded={packageExpanded}
              >
                <h3 style={{ ...sectionTitle, margin: 0, flex: 1, textAlign: "left" }}>Conteúdo do pacote</h3>
                <span
                  style={{
                    display: "inline-flex",
                    transition: "transform 0.2s",
                    transform: packageExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    color: "var(--text-muted)",
                  }}
                >
                  <Icon name="chevronRight" size={16} aria-hidden />
                </span>
              </button>
              <p style={sectionMeta}>Selecione o que deve ser incluído no envio.</p>
              {packageExpanded && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {selectionKeys.map(([key, label]) => (
                    <label key={key} style={checkboxRow}>
                      <input
                        type="checkbox"
                        checked={sendSelections[key]}
                        onChange={() => toggleSendSelection(key)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <hr style={divider} />

            <div>
              <h3 style={sectionTitle}>Método de envio</h3>
              <p style={sectionMeta}>
                WhatsApp e Email: use «Salvar e Gerar Design» na barra superior para guardar; a integração
                destes canais segue o fluxo da app. O pacote JSON pode ser descarregado em «Ações finais».
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <Button
                  type="button"
                  variant={sendMethod === "whatsapp" ? "primary" : "outline"}
                  onClick={() => setSendMethod("whatsapp")}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Icon name="whatsapp" size={16} aria-hidden />
                    WhatsApp
                  </span>
                </Button>
                <Button
                  type="button"
                  variant={sendMethod === "email" ? "primary" : "outline"}
                  onClick={() => setSendMethod("email")}
                >
                  Email
                </Button>
              </div>
            </div>

            {sendSelections.image ? (
              <>
                <hr style={divider} />
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <h3 style={sectionTitle}>Imagem renderizada</h3>
                  <p style={sectionMeta}>
                    {photoCaptureUrl
                      ? "Captura pronta para download."
                      : "Capture uma imagem no Photo Mode da toolbar."}
                  </p>
                  {photoCaptureUrl ? (
                    <Button
                      type="button"
                      variant="primary"
                      fullWidth
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = photoCaptureUrl;
                        link.download = photoCaptureUrl.startsWith("data:image/jpeg")
                          ? "pimo-photo.jpg"
                          : "pimo-photo.png";
                        link.click();
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10, width: "100%", justifyContent: "center" }}>
                        <Icon20><Icon name="adminSave" size={18} aria-hidden /></Icon20>
                        Pré-visualizar / descarregar imagem
                      </span>
                    </Button>
                  ) : (
                    <Button type="button" variant="primary" fullWidth onClick={() => void captureImageForSend()}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10, width: "100%", justifyContent: "center" }}>
                        <Icon20><Icon name="camera" size={18} aria-hidden /></Icon20>
                        Capturar agora
                      </span>
                    </Button>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
