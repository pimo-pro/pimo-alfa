export interface V4IconProps {
  size?: number;
  color?: string;
  className?: string;
  "aria-hidden"?: boolean;
  title?: string;
}

/** All icon names available in v4 */
export type V4IconName =
  // ── Navigation (sidebar) ──────────────────────────────────
  | "furniture"     // catalog / móveis
  | "project"       // project / projeto
  | "materials"     // materials / materiais
  | "fabrication"   // manufacturing / fabricação
  | "tracking"      // tracking / rastreio
  | "settings"      // settings / definições
  // ── Viewer tools ──────────────────────────────────────────
  | "select"        // selection tool
  | "move"          // move tool
  | "rotate"        // rotate tool
  | "camera"        // camera / snapshot
  | "orbit"         // orbit controls
  | "ruler"         // measurements
  | "grid"          // grid toggle
  | "room"          // room / walls
  // ── Actions ───────────────────────────────────────────────
  | "undo"          // undo
  | "redo"          // redo
  | "send"          // send / export
  | "duplicate"     // duplicate
  | "delete"        // delete
  | "close"         // close / dismiss
  | "check"         // confirm / check
  | "upload"        // upload / import
  | "download"      // download / export
  // ── Status ────────────────────────────────────────────────
  | "alertWarning"  // warning
  | "alertInfo"     // info
  | "alertError"    // error
  // ── Manufacturing ─────────────────────────────────────────
  | "cutlist"       // cut list / lista de corte
  | "qrcode"        // QR code / etiqueta
  | "blueprint"     // blueprint / planta
  | "cnc"           // CNC machine
  | "wood"          // wood material
  | "hardware"      // hardware / ferragens
  // ── UI ────────────────────────────────────────────────────
  | "chevronRight"  // chevron right
  | "chevronDown"   // chevron down
  | "menu"          // hamburger menu
  | "search"        // search
  | "plus"          // add / plus
  | "logo";         // pimo logo mark
