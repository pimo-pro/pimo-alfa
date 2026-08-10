/**
 * Simulated Annealing — refino local da ordem de inserção (inspirado em meta-heurísticas
 * industriais + espírito de exploração do SVGnest). Não existe SA nativo no SVGnest;
 * complementar ao GA para o motor Deepnest do pimo-alfa.
 */

export type SaIndividual = {
  order: number[];
  rotations: number[];
  fitness: number;
};

export type SaConfig = {
  iterations: number;
  initialTemperature: number;
  coolingRate: number;
  seed?: number;
};

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function runSimulatedAnnealing(
  initial: SaIndividual,
  evaluate: (ind: SaIndividual) => number,
  config: SaConfig
): SaIndividual {
  const rand = mulberry32(config.seed ?? 1337);
  let current: SaIndividual = {
    order: initial.order.slice(),
    rotations: initial.rotations.slice(),
    fitness: evaluate(initial),
  };
  let best = { ...current, order: current.order.slice(), rotations: current.rotations.slice() };
  let temp = config.initialTemperature;

  for (let i = 0; i < config.iterations; i++) {
    const next: SaIndividual = {
      order: current.order.slice(),
      rotations: current.rotations.slice(),
      fitness: 0,
    };
    if (rand() < 0.7 && next.order.length > 1) {
      const a = Math.floor(rand() * next.order.length);
      const b = Math.floor(rand() * next.order.length);
      const tmp = next.order[a]!;
      next.order[a] = next.order[b]!;
      next.order[b] = tmp;
    } else if (next.rotations.length > 0) {
      const a = Math.floor(rand() * next.rotations.length);
      next.rotations[a] = next.rotations[a] === 90 ? 0 : 90;
    }
    next.fitness = evaluate(next);
    const delta = next.fitness - current.fitness;
    if (delta < 0 || rand() < Math.exp(-delta / Math.max(temp, 1e-9))) {
      current = next;
      if (current.fitness < best.fitness) {
        best = {
          order: current.order.slice(),
          rotations: current.rotations.slice(),
          fitness: current.fitness,
        };
      }
    }
    temp *= config.coolingRate;
  }
  return best;
}
