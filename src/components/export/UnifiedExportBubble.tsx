/**
 * Bolha unificada «Salvar e Gerar Design»: exportação + envio de pacote.
 * UI redesenhada; mesma orquestração que o painel legado (hooks existentes).
 */

import type { CSSProperties, ReactNode } from "react";
import { useProject } from "../../context/useProject";
import { useGerarArquivoHandlers } from "../../hooks/useGerarArquivoHandlers";
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

const rowGap16: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
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
    <Button type="button" variant="secondary" fullWidth disabled={disabled} onClick={onClick}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          width: "100%",
        }}
      >
        <Icon20>{icon ?? <span style={{ width: 18, height: 18 }} aria-hidden />}</Icon20>
        <span style={{ lineHeight: 1.25, textAlign: "center" }}>{label}</span>
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
          width: "min(100%, 1000px)",
          maxWidth: 1000,
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
            flexDirection: "row",
            gap: 32,
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            <div style={rowGap16}>
              <div>
                <h2 style={{ ...sectionTitle, marginBottom: 4 }}>Enviar projeto</h2>
                <p style={{ ...sectionMeta, marginBottom: 0 }}>
                  Configure o pacote e o canal antes de guardar e enviar.
                </p>
              </div>

              <hr style={divider} />

              <div>
                <h3 style={sectionTitle}>Conteúdo do pacote</h3>
                <p style={sectionMeta}>Selecione o que deve ser incluído no envio.</p>
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
                    WhatsApp
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
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 24,
              overflowY: "auto",
              paddingLeft: 4,
            }}
          >
            <div>
              <h3 style={sectionTitle}>Gerar arquivo</h3>
              <p style={sectionMeta}>Exportações a partir do estado atual do projeto.</p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 16,
                }}
              >
                <ExportRow label="Gerar PDF Técnico" onClick={wrap(onPdfTecnico)} disabled={!hasBoxes} />
                <ExportRow label="Gerar Cutlist" onClick={wrap(onCutlist)} disabled={!hasBoxes} />
                <ExportRow
                  label="Gerar Etiquetas (UEE v5)"
                  onClick={wrap(onEtiquetas)}
                  disabled={!hasBoxes}
                />
                <ExportRow label="Gerar Arquivo Unificado (NOVO)" onClick={wrap(onUnificado)} disabled={!hasBoxes} />
                <ExportRow
                  label="Ambos (Cutlist + PDF + Unificado)"
                  onClick={wrap(onAmbos)}
                  disabled={!hasBoxes}
                />
                <ExportRow
                  label="Layout de Corte PRO"
                  onClick={wrap(onLayoutCortePro)}
                  disabled={!hasBoxes}
                  icon={<Icon name="blueprint" size={18} aria-hidden />}
                />
                <ExportRow
                  label="Layout de Corte MANUAL (Nesting V3)"
                  onClick={() => { onClose(); onOpenNestingV3?.(); }}
                  disabled={!hasBoxes || !onOpenNestingV3}
                  icon={<Icon name="grid" size={18} aria-hidden />}
                />
                <ExportRow label="arquivos cnc" onClick={wrap(onArquivosCnc)} disabled={!hasBoxes} />
              </div>
            </div>

            <hr style={{ ...divider, margin: 0 }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Ações finais</h3>
              <Button
                type="button"
                variant="primary"
                fullWidth
                disabled={project.estaCarregando}
                onClick={() => void handlePedirFabricacao()}
                style={{
                  background: "#22c55e",
                  borderColor: "#16a34a",
                  color: "#fff",
                }}
              >
                Enviar para Fábrica
              </Button>
              <Button
                type="button"
                variant="primary"
                fullWidth
                disabled={project.estaCarregando}
                onClick={handleDownloadPacote}
              >
                Download local (JSON)
              </Button>
              <Button
                type="button"
                variant="primary"
                fullWidth
                disabled={project.estaCarregando}
                onClick={() => void wrap(onArquivoCompleto)()}
              >
                Gerar arquivo completo
              </Button>
            </div>

            {sendSelections.image ? (
              <>
                <hr style={{ ...divider, margin: 0 }} />
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
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 10,
                          width: "100%",
                          justifyContent: "center",
                        }}
                      >
                        <Icon20>
                          <Icon name="adminSave" size={18} aria-hidden />
                        </Icon20>
                        Pré-visualizar / descarregar imagem
                      </span>
                    </Button>
                  ) : (
                    <Button type="button" variant="primary" fullWidth onClick={() => void captureImageForSend()}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 10,
                          width: "100%",
                          justifyContent: "center",
                        }}
                      >
                        <Icon20>
                          <Icon name="adminSave" size={18} aria-hidden />
                        </Icon20>
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
