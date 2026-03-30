import type { FC } from "react";
import type { IconProps } from "../types";

export const IconBlueprint: FC<IconProps> = ({
  size,
  color = "currentColor",
  className,
  "aria-hidden": ariaHidden = true,
  title,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden={ariaHidden}
  >
    {title ? <title>{title}</title> : null}
    <path d="M5 19V7l10 12H5z" />
    <path d="M9 14l1.5 1.5M11 12l1.5 1.5M13 10l1.5 1.5" />
  </svg>
);
