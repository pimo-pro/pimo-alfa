import type { FC } from "react";
import { v4IconRegistry } from "./registry";
import type { V4IconProps, V4IconName } from "./types";

interface V4IconComponentProps extends V4IconProps {
  name: V4IconName;
}

/**
 * V4 Icon component.
 * All icons are inline SVG — no fonts, no emojis, no raster images. (RULES.md R-01)
 *
 * @example
 * <V4Icon name="furniture" size={16} />
 * <V4Icon name="undo" size={20} color="var(--v4-accent)" />
 */
export const V4Icon: FC<V4IconComponentProps> = ({
  name,
  size = 16,
  color = "currentColor",
  className,
  "aria-hidden": ariaHidden = true,
  title,
}) => {
  const SvgIcon = v4IconRegistry[name];

  if (!SvgIcon) {
    if (import.meta.env.DEV) {
      console.warn(`[V4Icon] Unknown icon: "${name}"`);
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

export type { V4IconName, V4IconProps };
