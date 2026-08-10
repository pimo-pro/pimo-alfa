# Provenance — Deepnest / SVGnest

Algoritmos adaptadas de **SVGnest** (Jack Qiao), licença MIT.
Repositório de origem: https://github.com/Jack000/SVGnest

A pasta temporária `tmp/svgnest-src` é removida após extracção.
Não há dependência runtime do projecto externo (sem Clipper/DOM/workers originais).

Ficheiros adaptados conceptualmente:
- `geometryutil.js` → `geometry.ts` (NFP rectangular, bounds, rotação, colisão)
- `svgnest.js` GeneticAlgorithm → `geneticAlgorithm.ts`
- `placementworker.js` → `placement.ts` (packing via NFP + heurísticas)
- Simulated Annealing industrial → `simulatedAnnealing.ts` (refino local)
