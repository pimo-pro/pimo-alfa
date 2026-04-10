import type { SettingsSchema } from "../settings/settingsSchema";
import type { MaterialRecord } from "../materials/types";
import type { CutLayoutEngineOptions } from "../cutlayout/cutLayoutTypes";
import type { CutLayoutResult } from "../cutlayout/cutLayoutTypes";
import type { CutPiece } from "../cutlayout/cutLayoutTypes";
import { runCutLayout, type CutlistItemForPieces } from "../cutlayout/cutLayoutEngine";
import { getSheetDefinitionFromSettings, buildCncFromCutlistItems } from "../cnc/cncPipeline";
import { cloneSerializableCutLayoutEngineOptions } from "./industrialLayoutOptionsClone";
import type { IndustrialWorkerJobMessage } from "../../workers/industrialGeneration.worker";

type CncBundle = NonNullable<Awaited<ReturnType<typeof buildCncFromCutlistItems>>>;

let worker: Worker | null = null;
let jobSeq = 1;
const pending = new Map<string, { resolve: (_v: unknown) => void; reject: (_e: Error) => void }>();

function getIndustrialWorker(): Worker | null {
  if (typeof Worker === "undefined") return null;
  try {
    if (!worker) {
      worker = new Worker(new URL("../../workers/industrialGeneration.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (ev: MessageEvent) => {
        const d = ev.data as { type?: string; jobId?: string; ok?: boolean; result?: unknown; error?: string };
        if (d?.type !== "result" || typeof d.jobId !== "string") return;
        const entry = pending.get(d.jobId);
        if (!entry) return;
        pending.delete(d.jobId);
        if (d.ok) entry.resolve(d.result);
        else entry.reject(new Error(d.error ?? "Industrial worker error"));
      };
      worker.onerror = (err) => {
        for (const [, p] of pending) p.reject(new Error(err.message || "Worker error"));
        pending.clear();
      };
    }
    return worker;
  } catch {
    return null;
  }
}

function postJob<R>(msg: IndustrialWorkerJobMessage): Promise<R> {
  const w = getIndustrialWorker();
  if (!w) return Promise.reject(new Error("NO_WORKER"));
  return new Promise<R>((resolve, reject) => {
    pending.set(msg.jobId, {
      resolve: (v) => resolve(v as R),
      reject,
    });
    try {
      w.postMessage(msg);
    } catch (e) {
      pending.delete(msg.jobId);
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

export function abortIndustrialWorkerJob(jobId: string): void {
  worker?.postMessage({ type: "abortJob", jobId });
}

export function terminateIndustrialWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    for (const [, p] of pending) {
      p.reject(new Error("Worker terminado"));
    }
    pending.clear();
  }
}

export async function buildCncFromCutlistItemsInWorker(
  settings: SettingsSchema,
  materials: MaterialRecord[],
  projectStub: unknown,
  items: CutlistItemForPieces[],
  layoutOptions: CutLayoutEngineOptions
): Promise<CncBundle | null> {
  const layoutOptionsClean = cloneSerializableCutLayoutEngineOptions(layoutOptions);
  const jobId = `cnc-${jobSeq++}`;
  try {
    return (await postJob<CncBundle | null>({
      type: "job",
      jobId,
      kind: "buildCncFromItems",
      settings,
      materials,
      projectStub,
      items,
      layoutOptions: layoutOptionsClean,
    })) as CncBundle | null;
  } catch {
    return buildCncFromCutlistItems(projectStub, items, undefined, layoutOptions);
  }
}

export async function runCutLayoutInWorker(
  settings: SettingsSchema,
  materials: MaterialRecord[],
  pieces: CutPiece[],
  layoutOptions: CutLayoutEngineOptions
): Promise<CutLayoutResult> {
  const layoutOptionsClean = cloneSerializableCutLayoutEngineOptions(layoutOptions);
  const jobId = `lay-${jobSeq++}`;
  try {
    return (await postJob<CutLayoutResult>({
      type: "job",
      jobId,
      kind: "runCutLayout",
      settings,
      materials,
      pieces,
      layoutOptions: layoutOptionsClean,
    })) as CutLayoutResult;
  } catch {
    return runCutLayout(pieces, getSheetDefinitionFromSettings(), layoutOptions);
  }
}
