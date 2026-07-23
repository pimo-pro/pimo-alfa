/**
 * Download seletivo de PDFs industriais (Fase 4 + P1 politica binaria).
 * 1 PDF → blob direto; N PDFs → ZIP documental (só PDFs).
 * Nao escreve industrialDocumentHistory. Nao chama onArquivoCompleto.
 * Politica: qualquer override → todos shell; senao → todos classico.
 */

import JSZip from "jszip";
import type { ProjectState } from "@/context/projectTypes";
import {
  INDUSTRIAL_ONLINE_ANALYSIS_DOC_IDS,
  type IndustrialOnlineAnalysisDocId,
} from "./industrialOnlineAnalysisDocs";
import { documentHasOverrides } from "./applyIndustrialDocumentOverrides";
import { buildClassicIndustrialPdf } from "./buildClassicIndustrialPdf";
import { resolveIndustrialZipPdf } from "./resolveIndustrialZipPdf";
import type { IndustrialOnlineAnalysisPdfRowsMode } from "./generateIndustrialOnlineAnalysisPdf";
import {
  industrialOnlineAnalysisPdfFileName,
  industrialOnlineAnalysisPdfsZipFileName,
} from "./industrialOnlineAnalysisPdfFileNames";

export type DownloadIndustrialOnlineAnalysisResult = {
  ok: boolean;
  fileName: string;
  docCount: number;
  errors: { docId: IndustrialOnlineAnalysisDocId; message: string }[];
};

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function pdfToArrayBuffer(doc: { output: (type: string) => ArrayBuffer | Uint8Array }): ArrayBuffer {
  const out = doc.output("arraybuffer");
  if (out instanceof ArrayBuffer) return out;
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
}

export function listModifiedIndustrialDocIds(
  project: ProjectState
): IndustrialOnlineAnalysisDocId[] {
  return INDUSTRIAL_ONLINE_ANALYSIS_DOC_IDS.filter((id) =>
    documentHasOverrides(project.industrialDocumentOverrides, id)
  );
}

export async function downloadIndustrialOnlineAnalysisPdfs(
  project: ProjectState,
  docIds: IndustrialOnlineAnalysisDocId[],
  options?: { rowsMode?: IndustrialOnlineAnalysisPdfRowsMode; showPrices?: boolean }
): Promise<DownloadIndustrialOnlineAnalysisResult> {
  const rowsMode = options?.rowsMode ?? "effective";
  const unique = [...new Set(docIds)];
  const projectName = project.projectName?.trim() || "Projeto";
  const errors: DownloadIndustrialOnlineAnalysisResult["errors"] = [];
  const generated: { docId: IndustrialOnlineAnalysisDocId; fileName: string; buffer: ArrayBuffer }[] =
    [];

  for (const docId of unique) {
    try {
      const pdf = await resolveIndustrialZipPdf(
        project,
        docId,
        () =>
          buildClassicIndustrialPdf(project, docId, {
            showPrices: options?.showPrices,
          }),
        { rowsMode, showPrices: options?.showPrices }
      );
      const buffer = pdfToArrayBuffer(pdf);
      generated.push({
        docId,
        fileName: industrialOnlineAnalysisPdfFileName(projectName, docId),
        buffer,
      });
    } catch (err) {
      errors.push({
        docId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (generated.length === 0) {
    return {
      ok: false,
      fileName: "",
      docCount: 0,
      errors: errors.length
        ? errors
        : [{ docId: unique[0] ?? "cutlist", message: "Nenhum PDF gerado." }],
    };
  }

  if (generated.length === 1) {
    const one = generated[0];
    triggerBrowserDownload(
      new Blob([one.buffer], { type: "application/pdf" }),
      one.fileName
    );
    return { ok: errors.length === 0, fileName: one.fileName, docCount: 1, errors };
  }

  const zip = new JSZip();
  for (const item of generated) {
    zip.file(item.fileName, item.buffer);
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const zipName = industrialOnlineAnalysisPdfsZipFileName(projectName, rowsMode);
  triggerBrowserDownload(zipBlob, zipName);
  return {
    ok: errors.length === 0,
    fileName: zipName,
    docCount: generated.length,
    errors,
  };
}
