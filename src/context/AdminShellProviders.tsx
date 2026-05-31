import type { ReactNode } from "react";

import { PimoViewerProvider } from "./PimoViewerContext";
import { MaterialProvider } from "./materialContext";
import { ToastProvider } from "./ToastContext";

/**
 * Providers partilhados para AdminPanel fora do shell LegacyApp (ex.: /definicoes).
 * Replica a camada Material → Toast → PimoViewer usada em LegacyApp.
 */
export function AdminShellProviders({ children }: { children: ReactNode }) {
  return (
    <MaterialProvider>
      <ToastProvider>
        <PimoViewerProvider>{children}</PimoViewerProvider>
      </ToastProvider>
    </MaterialProvider>
  );
}
