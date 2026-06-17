/**
 * Curvas de animação industrial para corrediças (FASE 5).
 */

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

/** Blum Tandem — arranque suave, desaceleração moderada. */
export function tandemCurve(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.15
    ? easeInOutCubic(clamped / 0.15) * 0.08
    : 0.08 + easeInOutCubic((clamped - 0.15) / 0.85) * 0.92;
}

/** Blum Movento — curso longo com desaceleração prolongada no final. */
export function moventoCurve(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - (1 - clamped) ** 2.6;
}

/** Corrediça genérica — linear com leve ease. */
export function genericSlideCurve(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return easeInOutCubic(clamped);
}

/** Soft-close — desaceleração forte nos últimos 25%. */
export function softCloseTailCurve(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.75) return (clamped / 0.75) * 0.85;
  const tail = (clamped - 0.75) / 0.25;
  return 0.85 + (1 - (1 - tail) ** 4) * 0.15;
}

export function composeMotionCurve(
  baseCurve: (t: number) => number,
  softClose: boolean
): (t: number) => number {
  if (!softClose) return baseCurve;
  return (t: number) => {
    const base = baseCurve(t);
    const tail = softCloseTailCurve(t);
    return base * 0.65 + tail * 0.35;
  };
}

export function resolveDrawerMotionCurve(
  slideType?: string,
  softClose?: boolean
): (t: number) => number {
  const type = slideType ?? "Genérica";
  let base: (t: number) => number;
  if (type === "Blum Tandem") base = tandemCurve;
  else if (type === "Blum Movento") base = moventoCurve;
  else base = genericSlideCurve;
  return composeMotionCurve(base, Boolean(softClose));
}

export function resolveDrawerAnimationDurationMs(slideType?: string, softClose?: boolean): number {
  if (softClose) return 1800;
  if (slideType === "Blum Movento") return 1700;
  if (slideType === "Blum Tandem") return 1500;
  return 1400;
}
