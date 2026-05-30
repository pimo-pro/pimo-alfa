import type { FC } from "react";
import type { V4IconProps } from "../types";

// ── Re-export from original project ──────────────────────────
export {
  IconBlueprint as IconMfgBlueprint,
} from "../../../components/icons/groups/manufacturing";

export {
  IconAdminWood     as IconMfgWood,
  IconAdminChecklist as IconMfgChecklist,
  IconAdminScrew    as IconMfgHardware,
  IconAdminRuler    as IconMfgRuler,
  IconAdminTag      as IconMfgTag,
} from "../../../components/icons/groups/admin";

// ── New v4 manufacturing icons ────────────────────────────────

/** Cut list / lista de corte */
export const IconMfgCutList: FC<V4IconProps> = ({
  size = 20, color = "currentColor", className, "aria-hidden": ariaHidden = true, title,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden={ariaHidden}>
    {title && <title>{title}</title>}
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7 8h10M7 12h10M7 16h6" />
    <circle cx="17.5" cy="16" r="2" stroke={color} />
    <path d="M16.2 17.3L14 19.5" />
  </svg>
);

/** QR Code — tracking label */
export const IconMfgQRCode: FC<V4IconProps> = ({
  size = 20, color = "currentColor", className, "aria-hidden": ariaHidden = true, title,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden={ariaHidden}>
    {title && <title>{title}</title>}
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="5" y="5" width="3" height="3" fill={color} stroke="none" />
    <rect x="16" y="5" width="3" height="3" fill={color} stroke="none" />
    <rect x="5" y="16" width="3" height="3" fill={color} stroke="none" />
    <path d="M14 14h2v2h-2zM18 14h3M14 18v3M18 18h3v3h-3z" />
  </svg>
);

/** CNC machine */
export const IconMfgCNC: FC<V4IconProps> = ({
  size = 20, color = "currentColor", className, "aria-hidden": ariaHidden = true, title,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden={ariaHidden}>
    {title && <title>{title}</title>}
    <rect x="2" y="14" width="20" height="6" rx="1.5" />
    <path d="M6 14V8M18 14V8" />
    <path d="M4 8h16" />
    <path d="M12 8V4" />
    <circle cx="12" cy="3" r="1" fill={color} stroke="none" />
    <path d="M9 11h6" />
  </svg>
);

/** Status: production stage indicator */
export const IconMfgStage: FC<V4IconProps> = ({
  size = 20, color = "currentColor", className, "aria-hidden": ariaHidden = true, title,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden={ariaHidden}>
    {title && <title>{title}</title>}
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
    <path d="M7 12h3M14 12h3" />
  </svg>
);
