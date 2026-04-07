import { useState } from "react";

import Button from "../ui/Button";
import { useShowroomStore } from "./showroomStore";
import { MultiProjectGenerationModal } from "../projects/MultiProjectGenerationModal";

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
  const [showModal, setShowModal] = useState(false);

  if (projectIdsCarregados.length < 1) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={showroomLoading}
        onClick={() => setShowModal(true)}
        title="Gera ZIP com PDFs por projeto e ficheiros industriais globais (layout, drill, CNC)."
      >
        Gerar Arquivo Completo (Todos os Projetos)
      </Button>

      {showModal && (
        <MultiProjectGenerationModal
          projectIds={projectIdsCarregados}
          onClose={() => setShowModal(false)}
          onDownload={downloadBlob}
        />
      )}
    </>
  );
}
