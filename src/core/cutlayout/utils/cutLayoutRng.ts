export type SeededRng = {
  next: () => number;
  int: (_maxExclusive: number) => number;
};

export function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * Math.max(1, maxExclusive));
}

export function createSeededRng(seed: number): SeededRng {
  let state = (seed >>> 0) || 1;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
  return {
    next,
    int: (maxExclusive: number) => Math.floor(next() * Math.max(1, maxExclusive)),
  };
}

export function shuffleArray<T>(arr: T[], rng: SeededRng): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
