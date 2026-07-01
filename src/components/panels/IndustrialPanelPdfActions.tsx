import Button from "../ui/Button";

type Props = {
  onGeneratePdf: () => void;
  disabled?: boolean;
  label?: string;
};

export default function IndustrialPanelPdfActions({
  onGeneratePdf,
  disabled,
  label = "Gerar PDF",
}: Props) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
      <Button type="button" variant="secondary" disabled={disabled} onClick={onGeneratePdf}>
        {label}
      </Button>
    </div>
  );
}
