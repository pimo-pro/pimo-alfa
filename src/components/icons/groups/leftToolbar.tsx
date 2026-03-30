import type { FC } from "react";
import type { IconProps } from "../types";

export const IconHome: FC<IconProps> = ({
  size,
  color = "currentColor",
  className,
  "aria-hidden": ariaHidden = true,
  title,
}) => {
  const dim = size ?? 24;
  const fs = (15 / 24) * dim;
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden={ariaHidden}
    >
      {title ? <title>{title}</title> : null}
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize={fs}
        fill={color}
      >
        π
      </text>
    </svg>
  );
};

export const IconFurniture: FC<IconProps> = ({
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
    <path d="M5 18V10l3-4h8l3 4v8" />
    <path d="M5 18h14" />
    <path d="M9 10h6" />
  </svg>
);

export const IconModels: FC<IconProps> = ({
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
    <rect x="5" y="5" width="11" height="14" rx="1.5" />
    <rect x="9" y="8" width="11" height="14" rx="1.5" opacity="0.85" />
  </svg>
);

export const IconCalculator: FC<IconProps> = ({
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
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

export const IconElectro: FC<IconProps> = ({
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
    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
  </svg>
);

export const IconAccessories: FC<IconProps> = ({
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
    <path d="M12 6l2.5 5 5.5 1-4 4.5.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-4.5 5.5-1z" />
  </svg>
);

export const IconInfo: FC<IconProps> = ({
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
    <path d="M12 8h.01" />
  </svg>
);
