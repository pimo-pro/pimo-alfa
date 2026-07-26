/**
 * Hook React para reagir ao flag do Modelo A (sistema atual de gavetas).
 */

import { useEffect, useState } from "react";
import {
  isDrawerModeloAActive,
  subscribeDrawerModeloAFlags,
} from "../core/drawers/drawerSystemFlags";

/** @returns true se o Sistema Atual (Modelo A) está ativo. */
export function useDrawerModeloAActive(): boolean {
  const [active, setActive] = useState(() => isDrawerModeloAActive());

  useEffect(() => subscribeDrawerModeloAFlags(setActive), []);

  return active;
}
