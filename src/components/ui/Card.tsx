import type { ReactNode } from "react";
import "./ui.css";

type Props = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: number;
  className?: string;
};

export default function Card({ title, subtitle, children, maxWidth, className }: Props) {
  const maxClass = maxWidth === 420 ? " ui-card--max-420" : maxWidth === 640 ? " ui-card--max-640" : "";
  return (
    <section className={`ui-card${maxClass}${className ? ` ${className}` : ""}`}>
      {title ? <h2 className="ui-card__title">{title}</h2> : null}
      {subtitle ? <p className="ui-card__subtitle">{subtitle}</p> : null}
      {children}
    </section>
  );
}
