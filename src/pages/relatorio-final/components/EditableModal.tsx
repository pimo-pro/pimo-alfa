import type { ReactNode } from "react";
import Button from "@/components/ui/Button";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { reportModalBackdrop, reportModalPanel } from "../reportStyles";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export default function EditableModal({ open, title, onClose, children, footer }: Props) {
  if (!open) return null;
  return (
    <ModalPortal>
      <div
        style={reportModalBackdrop}
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div style={reportModalPanel} role="dialog" aria-modal="true" aria-label={title}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
            <Button type="button" variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </div>
          {children}
          {footer ? <div style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "flex-end" }}>{footer}</div> : null}
        </div>
      </div>
    </ModalPortal>
  );
}
