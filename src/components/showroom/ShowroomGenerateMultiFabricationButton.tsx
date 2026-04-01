import { useCallback, useState } from "react";

import { generateMultiProjectFabrication } from "../../core/fabrication/multiProjectFabrication";
import { useToast } from "../../context/ToastContext";
import Button from "../ui/Button";
import { useShowroomStore } from "./showroomStore";

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

type Props = {
  /** Enquanto o showroom recarrega snapshots, desativa o botão. */
  showroomLoading: boolean;
};

/**
 * Export industrial agregado (ZIP) para todos os projetos atualmente carregados no showroom.
 */
export function ShowroomGenerateMultiFabricationButton({ showroomLoading }: Props) {
  const projectIdsCarregados = useShowroomStore((s) => s.projectIdsCarregados);
  const { showToast, startLoading, stopLoading } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleClick = useCallback(async () => {
    const ids = useShowroomStore.getState().projectIdsCarregados;
    if (ids.length === 0) return;

    setIsGenerating(true);
    const loadingId = startLoading("Gerando pacote industrial…");
    try {
      const { zipBlob } = await generateMultiProjectFabrication(ids);
      downloadBlob(zipBlob, "fabricacao-multiprojeto.zip");
      showToast("Pacote industrial gerado.", "info");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Não foi possível gerar o pacote industrial: ${msg}`, "error");
    } finally {
      stopLoading(loadingId);
      setIsGenerating(false);
    }
  }, [showToast, startLoading, stopLoading]);

  if (projectIdsCarregados.length < 1) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={showroomLoading || isGenerating}
      onClick={handleClick}
      title="Gera ZIP com PDFs por projeto e ficheiros industriais globais (layout, drill, CNC)."
    >
      Gerar Arquivo Completo (Todos os Projetos)
    </Button>
  );
}
