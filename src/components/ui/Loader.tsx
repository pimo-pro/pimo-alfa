import "./ui.css";

type Props = {
  label?: string;
};

export default function Loader({ label = "Carregando..." }: Props) {
  return (
    <div className="ui-loader" role="status" aria-live="polite">
      <span className="ui-loader__spinner" />
      <span>{label}</span>
    </div>
  );
}
