import { createPortal } from "react-dom";
import type { ReactNode } from "react";

type ContextMenuPortalProps = {
  children: ReactNode;
};

/** Renderiza menu de contexto no document.body (z-index estável, fora do stacking do workspace). */
export default function ContextMenuPortal({ children }: ContextMenuPortalProps) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
