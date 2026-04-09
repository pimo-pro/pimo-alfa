import { useEffect, useId, type CSSProperties } from "react";
import {
  useSendProjectPackage,
  type SendMethod,
  type SendSelections,
} from "../../hooks/useSendProjectPackage";

const RESET_SEND_EVENT = "pimo:reset-send-package";

export type SendProjectPackageFormApi = ReturnType<typeof useSendProjectPackage>;

type SendProjectPackageFormProps = {
  hookApi: SendProjectPackageFormApi;
  showPrepareButton?: boolean;
  /** Layout em cartão/grid para UnifiedExportPanel (apenas visual). */
  unifiedPanelLayout?: boolean;
};

const iconWrap: CSSProperties = {
  width: 20,
  height: 20,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const iconSlotEmpty: CSSProperties = {
  width: 20,
  height: 20,
  flexShrink: 0,
};

const grid2: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 8,
};

const panelBtn: CSSProperties = {
  width: "100%",
  height: 32,
  padding: "8px 12px",
  borderRadius: 6,
  fontSize: 13,
  boxSizing: "border-box",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const labelRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  fontSize: 12,
  minHeight: 32,
};

/**
 * Formulário de envio de pacote. Recebe o estado/handlers do hook (instância única no painel unificado).
 */
export default function SendProjectPackageForm({
  hookApi,
  showPrepareButton = true,
  unifiedPanelLayout = false,
}: SendProjectPackageFormProps) {
  const sendMethodGroupId = useId();
  const {
    sendMethod,
    setSendMethod,
    sendSelections,
    toggleSendSelection,
    photoCaptureUrl,
    reset,
    handleSendPackage,
    captureImageForSend,
  } = hookApi;

  useEffect(() => {
    const onReset = () => reset();
    window.addEventListener(RESET_SEND_EVENT, onReset);
    return () => window.removeEventListener(RESET_SEND_EVENT, onReset);
  }, [reset]);

  if (unifiedPanelLayout) {
    const selectionKeys: [keyof SendSelections, string][] = [
      ["image", "Imagem renderizada"],
      ["viewerSnapshot", "Snapshot do Viewer (JSON)"],
      ["projectSnapshot", "Snapshot do Projeto (JSON)"],
      ["cutlist", "Cutlist"],
      ["ferragens", "Ferragens"],
      ["precos", "Preços"],
    ];
    const methodKeys: [SendMethod, string][] = [
      ["whatsapp", "WhatsApp"],
      ["email", "Email"],
      ["download", "Download local"],
    ];

    return (
      <div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Conteúdo do pacote</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Selecione o que deve ser incluído no envio</div>
        </div>
        <div style={grid2}>
          {selectionKeys.map(([key, label]) => (
            <label key={key} style={labelRow}>
              <span style={iconWrap}>
                <input
                  type="checkbox"
                  checked={sendSelections[key]}
                  onChange={() => toggleSendSelection(key)}
                />
              </span>
              <span style={{ lineHeight: 1.1 }}>{label}</span>
            </label>
          ))}
        </div>

        {sendSelections.image ? (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Imagem renderizada</div>
            <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 8 }}>
              {photoCaptureUrl
                ? "Captura pronta para download"
                : "Capture uma imagem no Photo Mode da toolbar"}
            </div>
            <div style={grid2}>
              {photoCaptureUrl ? (
                <button
                  type="button"
                  className="modal-action"
                  style={panelBtn}
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = photoCaptureUrl;
                    link.download = photoCaptureUrl.startsWith("data:image/jpeg")
                      ? "pimo-photo.jpg"
                      : "pimo-photo.png";
                    link.click();
                  }}
                >
                  <span style={iconSlotEmpty} aria-hidden />
                  <span style={{ lineHeight: 1.1, textAlign: "center" }}>Pré-visualizar</span>
                </button>
              ) : (
                <button type="button" className="modal-action" style={panelBtn} onClick={() => void captureImageForSend()}>
                  <span style={iconSlotEmpty} aria-hidden />
                  <span style={{ lineHeight: 1.1, textAlign: "center" }}>Capturar agora</span>
                </button>
              )}
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Método de envio</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Escolha como deseja enviar o pacote</div>
        </div>
        <div style={grid2}>
          {methodKeys.map(([key, label]) => (
            <label key={key} style={labelRow}>
              <span style={iconWrap}>
                <input
                  type="radio"
                  name={sendMethodGroupId}
                  checked={sendMethod === key}
                  onChange={() => setSendMethod(key)}
                />
              </span>
              <span style={{ lineHeight: 1.1 }}>{label}</span>
            </label>
          ))}
        </div>

        {showPrepareButton ? (
          <button type="button" className="modal-action" style={{ ...panelBtn, marginTop: 8 }} onClick={handleSendPackage}>
            <span style={iconSlotEmpty} aria-hidden />
            <span style={{ lineHeight: 1.1, textAlign: "center" }}>Preparar envio</span>
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="modal-list">
      <div className="modal-list-item">
        <div className="modal-list-info">
          <div className="modal-list-title">Conteúdo do pacote</div>
          <div className="modal-list-meta">Selecione o que deve ser incluído no envio</div>
        </div>
      </div>
      {(
        [
          ["image", "Imagem renderizada"],
          ["viewerSnapshot", "Snapshot do Viewer (JSON)"],
          ["projectSnapshot", "Snapshot do Projeto (JSON)"],
          ["cutlist", "Cutlist"],
          ["ferragens", "Ferragens"],
          ["precos", "Preços"],
        ] as [keyof SendSelections, string][]
      ).map(([key, label]) => (
        <label
          key={key}
          className="modal-list-item"
          style={{ cursor: "pointer", alignItems: "center" }}
        >
          <div className="modal-list-info">
            <div className="modal-list-title">{label}</div>
          </div>
          <input
            type="checkbox"
            checked={sendSelections[key]}
            onChange={() => toggleSendSelection(key)}
          />
        </label>
      ))}
      {sendSelections.image && (
        <div className="modal-list-item">
          <div className="modal-list-info">
            <div className="modal-list-title">Imagem renderizada</div>
            <div className="modal-list-meta">
              {photoCaptureUrl
                ? "Captura pronta para download"
                : "Capture uma imagem no Photo Mode da toolbar"}
            </div>
          </div>
          {photoCaptureUrl ? (
            <button
              type="button"
              className="modal-action"
              onClick={() => {
                const link = document.createElement("a");
                link.href = photoCaptureUrl;
                link.download = photoCaptureUrl.startsWith("data:image/jpeg")
                  ? "pimo-photo.jpg"
                  : "pimo-photo.png";
                link.click();
              }}
            >
              Pré-visualizar
            </button>
          ) : (
            <button type="button" className="modal-action" onClick={() => void captureImageForSend()}>
              Capturar agora
            </button>
          )}
        </div>
      )}
      <div className="modal-list-item">
        <div className="modal-list-info">
          <div className="modal-list-title">Método de envio</div>
          <div className="modal-list-meta">Escolha como deseja enviar o pacote</div>
        </div>
      </div>
      {(
        [
          ["whatsapp", "WhatsApp"],
          ["email", "Email"],
          ["download", "Download local"],
        ] as [SendMethod, string][]
      ).map(([key, label]) => (
        <label
          key={key}
          className="modal-list-item"
          style={{ cursor: "pointer", alignItems: "center" }}
        >
          <div className="modal-list-info">
            <div className="modal-list-title">{label}</div>
          </div>
          <input
            type="radio"
            name={sendMethodGroupId}
            checked={sendMethod === key}
            onChange={() => setSendMethod(key)}
          />
        </label>
      ))}
      {showPrepareButton ? (
        <button type="button" className="modal-action" onClick={handleSendPackage}>
          Preparar envio
        </button>
      ) : null}
    </div>
  );
}

export { RESET_SEND_EVENT };
