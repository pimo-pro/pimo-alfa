import type { FC } from "react";
import type { IconProps } from "../types";

export const IconDelete: FC<IconProps> = ({
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
    <path d="M9 3h6l1 2h5v2H3V5h5l1-2z" />
    <path d="M6 9v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9" />
    <path d="M10 13v5M12 13v5M14 13v5" />
  </svg>
);

export const IconRename: FC<IconProps> = ({
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
    <path d="M4 20h5l10-10a2 2 0 0 0 0-3l-2-2a2 2 0 0 0-3 0L4 15v5z" />
    <path d="M13 6l5 5" />
  </svg>
);

export const IconDuplicate: FC<IconProps> = ({
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
    <rect x="5" y="5" width="11" height="11" rx="1.5" />
    <rect x="9" y="9" width="11" height="11" rx="1.5" />
  </svg>
);

export const IconLock: FC<IconProps> = ({
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
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    <rect x="6" y="11" width="12" height="10" rx="2" />
    <circle cx="12" cy="15" r="1" fill={color} stroke="none" />
  </svg>
);

export const IconUnlock: FC<IconProps> = ({
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
    <path d="M8 11V8a4 4 0 0 1 7.3-2" />
    <path d="M16 6v2" />
    <rect x="6" y="11" width="12" height="10" rx="2" />
    <circle cx="12" cy="15" r="1" fill={color} stroke="none" />
  </svg>
);

export const IconAlignFront: FC<IconProps> = ({
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
    <path d="M8 6v12" />
    <rect x="10" y="8" width="9" height="8" rx="1" />
  </svg>
);

export const IconAlignBottom: FC<IconProps> = ({
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
    <path d="M6 18h12" />
    <rect x="7" y="6" width="10" height="10" rx="1" />
  </svg>
);

export const IconMaterial: FC<IconProps> = ({
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
    <path d="M4 14c0-4 8-10 8-10s8 6 8 10a8 8 0 1 1-16 0z" />
    <circle cx="9" cy="13" r="1.2" fill={color} stroke="none" />
    <circle cx="13" cy="11" r="1.2" fill={color} stroke="none" />
    <circle cx="12" cy="15" r="1.2" fill={color} stroke="none" />
  </svg>
);

export const IconMouse: FC<IconProps> = ({
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
    <path d="M12 5a5 5 0 0 1 5 5v5a3 3 0 0 1-6 0v-5a5 5 0 0 1 1-3.5" />
    <path d="M12 11v2" />
  </svg>
);

export const IconChevronRight: FC<IconProps> = ({
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
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const IconCheck: FC<IconProps> = ({
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
    <path d="M5 12l4 4 10-10" />
  </svg>
);
