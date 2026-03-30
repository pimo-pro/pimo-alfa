/**
 * Modal Gerar Arquivo — painel de botões para gerar Cutlist, PDF Técnico, Unificado, Ambos ou arquivo completo (ZIP).
 */

import { Icon } from "@/components/icons";

type Props = {
  onClose: () => void;
  hasBoxes: boolean;
  onCutlist: () => void;
  onPdfTecnico: () => void;
  onUnificado: () => void;
  onAmbos: () => void;
  onLayoutCortePro: () => void;
  onArquivoCompleto: () => void;
};

const btnStyle = { width: "100%", fontSize: 13, marginBottom: 8 } as const;

export default function GerarArquivoModal({
  onClose,
  hasBoxes,
  onCutlist,
  onPdfTecnico,
  onUnificado,
  onAmbos,
  onLayoutCortePro,
  onArquivoCompleto,
}: Props) {
  const wrap = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Gerar Arquivo</div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="modal-list" style={{ padding: "16px" }}>
          <button
            type="button"
            className="modal-action"
            style={btnStyle}
            onClick={wrap(onCutlist)}
            disabled={!hasBoxes}
          >
            Gerar Cutlist
          </button>
          <button
            type="button"
            className="modal-action"
            style={btnStyle}
            onClick={wrap(onPdfTecnico)}
            disabled={!hasBoxes}
          >
            Gerar PDF Técnico
          </button>
          <button
            type="button"
            className="modal-action"
            style={btnStyle}
            onClick={wrap(onUnificado)}
            disabled={!hasBoxes}
          >
            Gerar Arquivo Unificado (NOVO)
          </button>
          <button
            type="button"
            className="modal-action"
            style={btnStyle}
            onClick={wrap(onAmbos)}
            disabled={!hasBoxes}
          >
            Ambos (Cutlist + PDF Técnico + Arquivo Unificado)
          </button>
          <button
            type="button"
            className="modal-action"
            style={btnStyle}
            onClick={wrap(onLayoutCortePro)}
            disabled={!hasBoxes}
          >
            <span aria-hidden style={{ display: "inline-flex", marginRight: 6 }}>
              <Icon name="blueprint" size={14} aria-hidden />
            </span>
            Layout de Corte PRO
          </button>
          <button
            type="button"
            className="modal-action"
            style={{ ...btnStyle, marginBottom: 0, fontWeight: 600 }}
            onClick={wrap(onArquivoCompleto)}
            disabled={!hasBoxes}
          >
            Gerar arquivo completo
          </button>
        </div>
      </div>
    </div>
  );
}
