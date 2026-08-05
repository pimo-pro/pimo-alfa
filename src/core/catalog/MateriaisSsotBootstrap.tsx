/**
 * Bootstrap UI: aplica SSOT Excel ao arranque (uma vez).
 * Sem efeitos no pipeline industrial.
 */
import { useMateriaisSsotBootstrap } from "./useMateriaisSsotBootstrap";

export default function MateriaisSsotBootstrap() {
  useMateriaisSsotBootstrap(true);
  return null;
}
