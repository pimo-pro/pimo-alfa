/** Estado mínimo para resolver presença da costa traseira. */
export type BackPanelBoxLike = {
  noBackPanel?: boolean;
  costaAtiva?: boolean;
};

/** true = sem costa (visual + industrial). */
export function resolveNoBackPanel(box: BackPanelBoxLike): boolean {
  if (box.noBackPanel === true) return true;
  if (box.noBackPanel === false) return false;
  return box.costaAtiva === false;
}

/** Costa estrutural activa (inversa de sem costa). */
export function resolveCostaAtivaForBox(box: BackPanelBoxLike): boolean {
  return !resolveNoBackPanel(box);
}

export function applyNoBackPanelState<T extends BackPanelBoxLike>(box: T, enabled: boolean): T {
  return { ...box, noBackPanel: enabled, costaAtiva: !enabled };
}

export function resolveNoBackPanelFromOptions(opts?: BackPanelBoxLike): boolean {
  return resolveNoBackPanel(opts ?? {});
}
