import type { InputHTMLAttributes } from "react";
import "./ui.css";

type Props = {
  label?: string;
  error?: string | null;
  success?: string | null;
} & InputHTMLAttributes<HTMLInputElement>;

export default function Input({ label, error, success, className, ...props }: Props) {
  const stateClass = error ? " ui-input--error" : success ? " ui-input--success" : "";
  return (
    <label className="ui-form-group">
      {label ? <span className="ui-input__label">{label}</span> : null}
      <input
        {...props}
        className={`ui-input${stateClass}${className ? ` ${className}` : ""}`}
      />
      {error ? <span className="ui-input__error">{error}</span> : null}
      {!error && success ? <span className="ui-input__success">{success}</span> : null}
    </label>
  );
}
