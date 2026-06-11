import type { AutoLayoutPlan } from "../autoLayout/autoLayoutTypes";
import type { DesignVariantId, VariationKind } from "./intelligentDesignerTypes";
import type { ParsedIntent } from "./intentParser";

export type ConversationEntry = {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  intentKind?: ParsedIntent["kind"];
};

export type AppliedDesignSnapshot = {
  designId?: DesignVariantId;
  variationKind?: VariationKind;
  plan: AutoLayoutPlan;
  label: string;
};

const MAX_HISTORY = 5;

/**
 * Estado da conversa — histórico curto, design atual e pilha para undo.
 */
export class DesignConversationState {
  private entries: ConversationEntry[] = [];
  private seedBoxId: string | null = null;
  private lastApplied: AppliedDesignSnapshot | null = null;
  private undoStack: AppliedDesignSnapshot[] = [];
  private pendingLabel: string | null = null;

  setSeedBoxId(id: string | null): void {
    this.seedBoxId = id;
  }

  getSeedBoxId(): string | null {
    return this.seedBoxId;
  }

  addUserMessage(text: string, intentKind?: ParsedIntent["kind"]): void {
    this.push({ role: "user", text, timestamp: Date.now(), intentKind });
  }

  addAssistantMessage(text: string, intentKind?: ParsedIntent["kind"]): void {
    this.push({ role: "assistant", text, timestamp: Date.now(), intentKind });
  }

  getHistory(): ConversationEntry[] {
    return [...this.entries];
  }

  setPendingPreview(label: string): void {
    this.pendingLabel = label;
  }

  getPendingLabel(): string | null {
    return this.pendingLabel;
  }

  clearPending(): void {
    this.pendingLabel = null;
  }

  recordApplied(snapshot: AppliedDesignSnapshot): void {
    if (this.lastApplied) {
      this.undoStack.push(this.lastApplied);
      if (this.undoStack.length > 8) this.undoStack.shift();
    }
    this.lastApplied = snapshot;
    this.pendingLabel = null;
  }

  getLastApplied(): AppliedDesignSnapshot | null {
    return this.lastApplied;
  }

  popUndo(): AppliedDesignSnapshot | null {
    return this.undoStack.pop() ?? null;
  }

  hasUndo(): boolean {
    return this.undoStack.length > 0;
  }

  resetSession(): void {
    this.entries = [];
    this.pendingLabel = null;
  }

  private push(entry: ConversationEntry): void {
    this.entries.push(entry);
    while (this.entries.length > MAX_HISTORY) {
      this.entries.shift();
    }
  }
}
