import type { FC } from "react";
import type { IconProps } from "../types";

export const IconAlertWarning: FC<IconProps> = ({
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
    <path d="M12 4l9 15H3L12 4z" />
    <path d="M12 10v4" />
    <path d="M12 17v.01" strokeWidth={2} />
  </svg>
);

export const IconAlertInfo: FC<IconProps> = ({
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
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-5" />
    <circle cx="12" cy="8" r="1" fill={color} stroke="none" />
  </svg>
);

export const IconAlertError: FC<IconProps> = ({
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
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9l-6 6M9 9l6 6" />
  </svg>
);
