import type { ReactNode } from "react";
import "./ui.css";

type Props = {
  children: ReactNode;
  error?: string | null;
  hint?: string | null;
  className?: string;
};

export default function FormGroup({ children, error, hint, className }: Props) {
  return (
    <div className={`ui-form-group${className ? ` ${className}` : ""}`}>
      {children}
      {error ? <span className="ui-input__error">{error}</span> : null}
      {!error && hint ? <span className="ui-input__hint">{hint}</span> : null}
    </div>
  );
}
