import type { ReactNode } from "react";
import "./ui.css";

type Props = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export default function Section({ title, subtitle, children, className }: Props) {
  return (
    <section className={`ui-section${className ? ` ${className}` : ""}`}>
      {title || subtitle ? (
        <header className="ui-section__header">
          {title ? <h3 className="ui-section__title">{title}</h3> : null}
          {subtitle ? <p className="ui-section__subtitle">{subtitle}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
