import { useEffect, useRef } from "react";

import { canAccessAdminPanel } from "../auth/rbac";
import { AdminShellProviders } from "../context/AdminShellProviders";
import { useAuth } from "../auth/useAuth";
import AdminPanel from "./AdminPanel";

function disableInteractiveControls(root: HTMLElement) {
  root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>(
    "input, select, textarea, button"
  ).forEach((el) => {
    el.disabled = true;
    el.setAttribute("aria-disabled", "true");
  });
  root.querySelectorAll<HTMLElement>("[role='switch'], [role='slider']").forEach((el) => {
    el.setAttribute("aria-disabled", "true");
    el.tabIndex = -1;
  });
}

export default function SettingsPage() {
  const { hasPermission } = useAuth();
  const showAdminBack = canAccessAdminPanel(hasPermission);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    disableInteractiveControls(root);

    const observer = new MutationObserver(() => {
      disableInteractiveControls(root);
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <main className="settings-page-root" aria-label="Definições (modo visitante)">
      <div ref={contentRef} className="settings-page-content" aria-hidden>
        <AdminShellProviders>
          <AdminPanel />
        </AdminShellProviders>
      </div>
      <div className="settings-overlay-blocker" />
      {showAdminBack ? (
        <button
          type="button"
          onClick={() => {
            window.history.pushState({}, "", "/admin");
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
          title="Voltar para Admin"
          aria-label="Voltar para Admin"
          className="settings-back-to-admin-btn"
        >
          Voltar para Admin
        </button>
      ) : null}
    </main>
  );
}
