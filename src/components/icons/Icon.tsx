import type { FC } from "react";
import "./icon-system.css";
import { iconRegistry } from "./iconRegistry";
import type { IconComponentProps } from "./types";

/** Tamanho por omissão alinhado com toolbars densas (14px) e cabeçalho (18px): compromisso 16px. */
const DEFAULT_ICON_SIZE = 16;

export const Icon: FC<IconComponentProps> = ({
  name,
  size = DEFAULT_ICON_SIZE,
  color = "currentColor",
  className,
  "aria-hidden": ariaHidden = true,
  title,
}) => {
  const SvgIcon = iconRegistry[name];
  if (!SvgIcon) {
    if (import.meta.env.DEV) {
      console.warn(`[pimo Icon] Unknown icon: "${String(name)}"`);
    }
    return null;
  }
  return (
    <SvgIcon
      size={size}
      color={color}
      className={className}
      aria-hidden={ariaHidden}
      title={title}
    />
  );
};
