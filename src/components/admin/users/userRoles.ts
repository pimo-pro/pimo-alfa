/** Roles suportados pelo backend (`api/auth/index.php` — `pimo_role_permissions_map`). */
export const USER_ROLE_OPTIONS: readonly { value: string; label: string }[] = [
  { value: "visitor", label: "Visitor" },
  { value: "pro", label: "Pro" },
  { value: "ultra", label: "Ultra" },
  { value: "ultra+", label: "Ultra+" },
  { value: "admin", label: "Admin" },
];
