import type { ReactNode } from "react";
import "./ui.css";

export type MiniHelpTooltipProps = {
  /** Texto exibido no tooltip ao hover ou foco. */
  text: string;
  /** Classe CSS opcional no botão do ícone. */
  className?: string;
};

/**
 * Mini‑Tooltip de Ajuda: ícone "?" compacto com tooltip ao hover.
 * Reutilizável em títulos de secções e controlos do painel.
 */
export function MiniHelpTooltip({ text, className }: MiniHelpTooltipProps) {
  const rootClass = className ? `mini-help-tooltip ${className}` : "mini-help-tooltip";

  return (
    <button
      type="button"
      className={rootClass}
      aria-label={text}
      data-tooltip={text}
    >
      ?
    </button>
  );
}

export type SectionTitleWithHelpProps = {
  title: string;
  helpText: string;
  /** Conteúdo extra após o ícone (opcional). */
  trailing?: ReactNode;
};

/** Título de secção com ícone de ajuda alinhado na mesma linha. */
export function SectionTitleWithHelp({ title, helpText, trailing }: SectionTitleWithHelpProps) {
  return (
    <div className="section-title-with-help">
      <div className="section-title">{title}</div>
      <MiniHelpTooltip text={helpText} />
      {trailing}
    </div>
  );
}

/** Texto de ajuda padrão da secção Início do painel esquerdo. */
export const HOME_SECTION_HELP_TEXT =
  "Comece criando uma caixa e definindo os dados básicos do projeto.";
