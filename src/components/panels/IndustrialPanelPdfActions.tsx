import Button from "../ui/Button";

type Props = {
  onGeneratePdf?: () => void;
  onViewPdf?: () => void;
  onDownloadPdf?: () => void;
  disabled?: boolean;
  label?: string;
};

/**
 * Acções PDF do painel industrial.
 * - Modo legado: um botão `onGeneratePdf`
 * - Modo ver/descarregar: `onViewPdf` + `onDownloadPdf` (preparado para edições futuras)
 */
export default function IndustrialPanelPdfActions({
  onGeneratePdf,
  onViewPdf,
  onDownloadPdf,
  disabled,
  label = "Gerar PDF",
}: Props) {
  const dual = typeof onViewPdf === "function" && typeof onDownloadPdf === "function";

  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
      {dual ? (
        <>
          <Button type="button" variant="secondary" disabled={disabled} onClick={onViewPdf}>
            Visualizar
          </Button>
          <Button type="button" variant="secondary" disabled={disabled} onClick={onDownloadPdf}>
            Descarregar
          </Button>
        </>
      ) : (
        <Button type="button" variant="secondary" disabled={disabled} onClick={onGeneratePdf}>
          {label}
        </Button>
      )}
    </div>
  );
}
