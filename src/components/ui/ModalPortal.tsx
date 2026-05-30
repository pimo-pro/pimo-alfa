import { createPortal } from "react-dom";
import type { ReactNode } from "react";

type ModalPortalProps = {
  children: ReactNode;
};

/** Renderiza modais no `document.body` para evitar stacking context do painel lateral. */
export function ModalPortal({ children }: ModalPortalProps) {
  return createPortal(children, document.body);
}
