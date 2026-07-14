import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";

export type IndustrialExportPanelSeverity = "error" | "warning" | "info";

export type IndustrialExportPanelMessage = {
  id: string;
  timestamp: number;
  severity: IndustrialExportPanelSeverity;
  step: string;
  message: string;
  hints: string[];
  read: boolean;
};

type IndustrialExportPanelState = {
  messages: IndustrialExportPanelMessage[];
  addMessage: (input: Omit<IndustrialExportPanelMessage, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  unreadCount: () => number;
};

const MAX_MESSAGES = 200;

function makeId(): string {
  return `ind-export-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function fingerprint(msg: Pick<IndustrialExportPanelMessage, "step" | "message">): string {
  return `${msg.step}|${msg.message}`;
}

export const industrialExportPanelStore = createStore<IndustrialExportPanelState>((set, get) => ({
  messages: [],

  addMessage: (input) => {
    const fp = fingerprint(input);
    const existing = get().messages;
    const recentDup = existing.find(
      (m) => fingerprint(m) === fp && Date.now() - m.timestamp < 60_000
    );
    if (recentDup) return;

    const next: IndustrialExportPanelMessage = {
      id: makeId(),
      timestamp: Date.now(),
      read: false,
      hints: input.hints ?? [],
      severity: input.severity,
      step: input.step,
      message: input.message,
    };
    set({ messages: [next, ...existing].slice(0, MAX_MESSAGES) });
  },

  markRead: (id) => {
    set({
      messages: get().messages.map((m) => (m.id === id ? { ...m, read: true } : m)),
    });
  },

  markAllRead: () => {
    set({ messages: get().messages.map((m) => ({ ...m, read: true })) });
  },

  clearAll: () => set({ messages: [] }),

  unreadCount: () => get().messages.filter((m) => !m.read).length,
}));

export function useIndustrialExportPanel<T>(selector: (s: IndustrialExportPanelState) => T): T {
  return useStore(industrialExportPanelStore, selector);
}
