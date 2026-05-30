import type { FC } from "react";
import type { V4IconProps } from "../types";

// ── Re-export from original project ──────────────────────────
export {
  IconAlertWarning as IconStatusWarning,
  IconAlertInfo    as IconStatusInfo,
  IconAlertError   as IconStatusError,
} from "../../../components/icons/groups/alerts";

// ── Pimo v4 logo mark ─────────────────────────────────────────

/** Pimo logo — "P" geometric mark */
export const IconLogo: FC<V4IconProps> = ({
  size = 20, color = "currentColor", className, "aria-hidden": ariaHidden = true, title,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    className={className} aria-hidden={ariaHidden}>
    {title && <title>{title}</title>}
    <rect x="2" y="2" width="20" height="20" rx="5" fill={color} />
    <path d="M7 17V7h5.5a3.5 3.5 0 0 1 0 7H7" stroke="#fff" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);
