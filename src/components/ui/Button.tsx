import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./ui.css";

type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost" | "link";

type Props = {
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
  children,
  variant = "secondary",
  className,
  fullWidth = false,
  ...props
}: Props) {
  return (
    <button
      type="button"
      {...props}
      className={`ui-button ui-button--${variant}${fullWidth ? " ui-button--full" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      {children}
    </button>
  );
}
