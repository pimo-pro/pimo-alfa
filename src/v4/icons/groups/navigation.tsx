import type { FC } from "react";
import type { V4IconProps } from "../types";

// ── Sidebar navigation icons ─────────────────────────────────
// Imported from original project (read-only, no modification)
export {
  IconFurniture as IconNavFurniture,
  IconInfo      as IconNavInfo,
} from "../../../components/icons/groups/leftToolbar";

export {
  IconSettings as IconNavSettings,
} from "../../../components/icons/groups/header";

export {
  IconBlueprint as IconNavBlueprint,
} from "../../../components/icons/groups/manufacturing";

// ── New v4-specific navigation icons ─────────────────────────

/** Project — planta/esquema */
export const IconNavProject: FC<V4IconProps> = ({
  size = 20, color = "currentColor", className, "aria-hidden": ariaHidden = true, title,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden={ariaHidden}>
    {title && <title>{title}</title>}
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 9v12" />
    <path d="M12 6h.01" />
  </svg>
);

/** Materials — wood slab */
export const IconNavMaterials: FC<V4IconProps> = ({
  size = 20, color = "currentColor", className, "aria-hidden": ariaHidden = true, title,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden={ariaHidden}>
    {title && <title>{title}</title>}
    <rect x="2" y="7" width="20" height="10" rx="1.5" />
    <path d="M6 7v10" />
    <path d="M10 7v10" />
    <path d="M14 7v10" />
    <path d="M18 7v10" />
  </svg>
);

/** Fabrication — CNC/gears */
export const IconNavFabrication: FC<V4IconProps> = ({
  size = 20, color = "currentColor", className, "aria-hidden": ariaHidden = true, title,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden={ariaHidden}>
    {title && <title>{title}</title>}
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
  </svg>
);

/** Tracking — QR/barcode scan */
export const IconNavTracking: FC<V4IconProps> = ({
  size = 20, color = "currentColor", className, "aria-hidden": ariaHidden = true, title,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden={ariaHidden}>
    {title && <title>{title}</title>}
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h2v2h-2zM18 14h3M14 18v3M18 18h3v3h-3z" />
    <rect x="5" y="5" width="3" height="3" fill={color} stroke="none" />
    <rect x="16" y="5" width="3" height="3" fill={color} stroke="none" />
    <rect x="5" y="16" width="3" height="3" fill={color} stroke="none" />
  </svg>
);
