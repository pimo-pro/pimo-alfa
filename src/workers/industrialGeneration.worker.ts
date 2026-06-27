/// <reference lib="webworker" />

import type { SettingsSchema } from "../core/settings/settingsSchema";
import type { MaterialRecord } from "../core/materials/types";
import { setIndustrialSettingsReadOverride } from "../core/settings/settingsStorage";
import { setIndustrialMaterialsReadOverride } from "../core/materials/service";
import { runCutLayout, type CutlistItemForPieces } from "../core/cutlayout/cutLayoutEngine";
import type { CutLayoutEngineOptions, CutPiece } from "../core/cutlayout/cutLayoutTypes";
import { getSheetDefinitionFromSettings, buildCncFromCutlistItems } from "../core/cnc/cncPipeline";
import { withIndustrialOutputAuthorization } from "../core/industrial/industrialOutputGuard";

const abortedJobs = new Set<string>();

export type IndustrialWorkerJobMessage =
  | {
      type: "job";
      jobId: string;
      kind: "buildCncFromItems";
      settings: SettingsSchema;
      materials: MaterialRecord[];
      projectStub: unknown;
      items: CutlistItemForPieces[];
      layoutOptions: CutLayoutEngineOptions;
    }
  | {
      type: "job";
      jobId: string;
      kind: "runCutLayout";
      settings: SettingsSchema;
      materials: MaterialRecord[];
      pieces: CutPiece[];
      layoutOptions: CutLayoutEngineOptions;
    };

type WorkerOutbound =
  | { type: "result"; jobId: string; ok: true; result: unknown }
  | { type: "result"; jobId: string; ok: false; error: string };

function wrapOpts(jobId: string, opts: CutLayoutEngineOptions): CutLayoutEngineOptions {
  return {
    ...opts,
    shouldAbort: () => abortedJobs.has(jobId),
  };
}

function handleJob(msg: IndustrialWorkerJobMessage): void {
  const { jobId, settings, materials } = msg;
  setIndustrialSettingsReadOverride(settings);
  setIndustrialMaterialsReadOverride(materials);
  let outbound: WorkerOutbound;
  try {
    outbound = withIndustrialOutputAuthorization("all", () => {
      if (abortedJobs.has(jobId)) throw new Error("Aborted");
      if (msg.kind === "buildCncFromItems") {
        const result = buildCncFromCutlistItems(
          msg.projectStub,
          msg.items,
          undefined,
          wrapOpts(jobId, msg.layoutOptions)
        );
        return { type: "result", jobId, ok: true as const, result };
      }
      const sheet = getSheetDefinitionFromSettings();
      const result = runCutLayout(msg.pieces, sheet, wrapOpts(jobId, msg.layoutOptions));
      return { type: "result", jobId, ok: true as const, result };
    });
  } catch (e) {
    outbound = {
      type: "result",
      jobId,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
  abortedJobs.delete(jobId);
  setIndustrialSettingsReadOverride(null);
  setIndustrialMaterialsReadOverride(null);
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(outbound);
}

self.onmessage = (ev: MessageEvent) => {
  const d = ev.data as { type?: string; jobId?: string } | IndustrialWorkerJobMessage;
  if (!d || typeof d !== "object") return;
  if (d.type === "abortJob" && typeof d.jobId === "string") {
    abortedJobs.add(d.jobId);
    return;
  }
  if (d.type === "job") {
    handleJob(d as IndustrialWorkerJobMessage);
  }
};
