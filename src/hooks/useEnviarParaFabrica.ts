import { useCallback, useState } from "react";
import type { ProjectState } from "../context/projectTypes";
import type { MaterialIndustrial } from "../core/manufacturing/materials";
import { submitEnviarParaFabrica } from "../core/fabrication/enviarParaFabrica";

export type UseEnviarParaFabricaResult = {
  sending: boolean;
  lastOrderId: string | null;
  lastError: string | null;
  enviar: () => Promise<void>;
};

export function useEnviarParaFabrica(
  project: Pick<
    ProjectState,
    | "projectName"
    | "currentProjectId"
    | "boxes"
    | "rules"
    | "materialId"
    | "remates"
    | "rodapes"
    | "extractedPartsByBoxId"
    | "pieceObservacoes"
    | "industrialPieceEdits"
    | "industrialOperacoes"
  >,
  materials: MaterialIndustrial[]
): UseEnviarParaFabricaResult {
  const [sending, setSending] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const enviar = useCallback(async () => {
    if ((project.boxes ?? []).length === 0) {
      window.alert("Adicione caixas ao projeto antes de enviar para fábrica.");
      return;
    }
    setSending(true);
    setLastError(null);
    try {
      const result = await submitEnviarParaFabrica(project, materials, {
        skipArtifactValidation: true,
      });
      if (result.submit?.ok && result.submit.orderId) {
        setLastOrderId(result.submit.orderId);
        window.alert(
          `Ordem enviada para fábrica.\nID: ${result.submit.orderId}\nPeças: ${result.submit.pecasCount ?? result.payload?.pecas.length ?? 0}`
        );
      } else {
        const err = result.submit?.error ?? "Falha no envio";
        setLastError(err);
        window.alert(`Não foi possível enviar para fábrica: ${err}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastError(msg);
      window.alert(`Erro ao enviar: ${msg}`);
    } finally {
      setSending(false);
    }
  }, [project, materials]);

  return { sending, lastOrderId, lastError, enviar };
}
