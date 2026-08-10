/**
 * Genetic Algorithm adaptado de SVGnest (MIT — Jack Qiao).
 * Gene = ordem de inserção + ângulo de rotação por peça.
 */

import { getPolygonBounds, rotatePolygon, type DnPolygon } from "./geometry";

export type GaIndividual = {
  placement: DnPolygon[];
  rotation: number[];
  fitness?: number;
};

export type GaConfig = {
  populationSize: number;
  mutationRate: number;
  /** Nº de ângulos candidatos (SVGnest usa 4 → 0/90/180/270). Industrial: tipicamente 2 → 0/90. */
  rotations: number;
};

export class GeneticAlgorithm {
  config: GaConfig;
  binBounds: { width: number; height: number };
  population: GaIndividual[];

  constructor(adam: DnPolygon[], bin: DnPolygon, config?: Partial<GaConfig>) {
    this.config = {
      populationSize: config?.populationSize ?? 10,
      mutationRate: config?.mutationRate ?? 10,
      rotations: config?.rotations ?? 2,
    };
    this.binBounds = getPolygonBounds(bin);
    const angles = adam.map((part) => this.randomAngle(part));
    this.population = [{ placement: adam.slice(), rotation: angles }];
    while (this.population.length < this.config.populationSize) {
      this.population.push(this.mutate(this.population[0]!));
    }
  }

  randomAngle(part: DnPolygon): number {
    const angleList: number[] = [];
    const n = Math.max(this.config.rotations, 1);
    for (let i = 0; i < n; i++) angleList.push(i * (360 / n));
    // shuffle
    for (let i = angleList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = angleList[i]!;
      angleList[i] = angleList[j]!;
      angleList[j] = tmp;
    }
    for (const angle of angleList) {
      const rotated = rotatePolygon(part, angle);
      if (
        (rotated.width ?? 0) <= this.binBounds.width + 1e-6 &&
        (rotated.height ?? 0) <= this.binBounds.height + 1e-6
      ) {
        return angle;
      }
    }
    return 0;
  }

  mutate(individual: GaIndividual): GaIndividual {
    const clone: GaIndividual = {
      placement: individual.placement.slice(),
      rotation: individual.rotation.slice(),
    };
    for (let i = 0; i < clone.placement.length; i++) {
      if (Math.random() < 0.01 * this.config.mutationRate) {
        const j = i + 1;
        if (j < clone.placement.length) {
          const tmp = clone.placement[i]!;
          clone.placement[i] = clone.placement[j]!;
          clone.placement[j] = tmp;
          const tmpR = clone.rotation[i]!;
          clone.rotation[i] = clone.rotation[j]!;
          clone.rotation[j] = tmpR;
        }
      }
      if (Math.random() < 0.01 * this.config.mutationRate) {
        clone.rotation[i] = this.randomAngle(clone.placement[i]!);
      }
    }
    return clone;
  }

  mate(male: GaIndividual, female: GaIndividual): [GaIndividual, GaIndividual] {
    const cutpoint = Math.round(
      Math.min(Math.max(Math.random(), 0.1), 0.9) * (male.placement.length - 1)
    );
    const gene1 = male.placement.slice(0, cutpoint);
    const rot1 = male.rotation.slice(0, cutpoint);
    const gene2 = female.placement.slice(0, cutpoint);
    const rot2 = female.rotation.slice(0, cutpoint);

    const contains = (gene: DnPolygon[], id: string | undefined) =>
      gene.some((g) => g.id === id);

    for (let i = 0; i < female.placement.length; i++) {
      if (!contains(gene1, female.placement[i]!.id)) {
        gene1.push(female.placement[i]!);
        rot1.push(female.rotation[i]!);
      }
    }
    for (let i = 0; i < male.placement.length; i++) {
      if (!contains(gene2, male.placement[i]!.id)) {
        gene2.push(male.placement[i]!);
        rot2.push(male.rotation[i]!);
      }
    }
    return [
      { placement: gene1, rotation: rot1 },
      { placement: gene2, rotation: rot2 },
    ];
  }

  generation(): void {
    this.population.sort((a, b) => (a.fitness ?? 1e9) - (b.fitness ?? 1e9));
    const newPop: GaIndividual[] = [this.population[0]!];
    while (newPop.length < this.config.populationSize) {
      const male = this.randomWeightedIndividual();
      const female = this.randomWeightedIndividual(male);
      const children = this.mate(male, female);
      newPop.push(this.mutate(children[0]));
      if (newPop.length < this.config.populationSize) {
        newPop.push(this.mutate(children[1]));
      }
    }
    this.population = newPop;
  }

  randomWeightedIndividual(exclude?: GaIndividual): GaIndividual {
    const pop = exclude ? this.population.filter((p) => p !== exclude) : this.population;
    const sorted = pop.slice().sort((a, b) => (a.fitness ?? 1e9) - (b.fitness ?? 1e9));
    // prefer better (lower fitness)
    const r = Math.random();
    const idx = Math.min(sorted.length - 1, Math.floor(r * r * sorted.length));
    return sorted[idx]!;
  }
}
