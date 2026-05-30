import type { FC } from "react";
import type { V4IconProps } from "../types";

// ── Re-export from original project ──────────────────────────
export {
  IconUndo   as IconActionUndo,
  IconRedo   as IconActionRedo,
  IconSend   as IconActionSend,
} from "../../../components/icons/groups/toolbar";

export {
  IconSelect    as IconActionSelect,
  IconMove      as IconActionMove,
  IconRotate    as IconActionRotate,
  IconCamera    as IconActionCamera,
  IconRuler     as IconActionRuler,
  IconGrid      as IconActionGrid,
  IconRoom      as IconActionRoom,
  IconOrbit     as IconActionOrbit,
} from "../../../components/icons/groups/viewer";

export {
  IconDuplicate as IconActionDuplicate,
  IconDelete    as IconActionDelete,
  IconClose     as IconActionClose,
  IconCheck     as IconActionCheck,
} from "../../../components/icons/groups/contextMenu";

export {
  IconUpload as IconActionUpload,
} from "../../../components/icons/groups/header";

// ── New v4-specific action icons ─────────────────────────────

/** Download / export file */
export const IconActionDownload: FC<V4IconProps> = ({
  size = 20, color = "currentColor", className, "aria-hidden": ariaHidden = true, title,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden={ariaHidden}>
    {title && <title>{title}</title>}
    <path d="M12 3v13M8 12l4 4 4-4" />
    <path d="M4 20h16" />
  </svg>
);

/** Search */
export const IconActionSearch: FC<V4IconProps> = ({
  size = 20, color = "currentColor", className, "aria-hidden": ariaHidden = true, title,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden={ariaHidden}>
    {title && <title>{title}</title>}
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5L21 21" />
  </svg>
);

/** Plus / add */
export const IconActionPlus: FC<V4IconProps> = ({
  size = 20, color = "currentColor", className, "aria-hidden": ariaHidden = true, title,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden={ariaHidden}>
    {title && <title>{title}</title>}
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/** Chevron right */
export const IconChevronRight: FC<V4IconProps> = ({
  size = 20, color = "currentColor", className, "aria-hidden": ariaHidden = true, title,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden={ariaHidden}>
    {title && <title>{title}</title>}
    <path d="M9 18l6-6-6-6" />
  </svg>
);

/** Chevron down */
export const IconChevronDown: FC<V4IconProps> = ({
  size = 20, color = "currentColor", className, "aria-hidden": ariaHidden = true, title,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden={ariaHidden}>
    {title && <title>{title}</title>}
    <path d="M6 9l6 6 6-6" />
  </svg>
);

/** Menu / hamburger */
export const IconMenu: FC<V4IconProps> = ({
  size = 20, color = "currentColor", className, "aria-hidden": ariaHidden = true, title,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.5} strokeLinecap="round"
    className={className} aria-hidden={ariaHidden}>
    {title && <title>{title}</title>}
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
