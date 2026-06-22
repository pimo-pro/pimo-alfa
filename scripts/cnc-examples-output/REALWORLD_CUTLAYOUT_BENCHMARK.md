# Benchmark CutLayout — projecto real (28 peças)

## Entrada
- Fixture: `buildRealWorldBenchmarkScenario()`
- Manifest: `REALWORLD_BENCH_INPUT.json`
- Materiais: carvalho, mdf_branco, mdf_branco-10, mdf_branco-16, mdf_branco-19 (19 mm)

## Comparativo

| Métrica | Antes | Depois | Δ |
|---------|-------|--------|---|
| Chapas | 6 | 6 | 0 |
| Desperdício médio/chapa | 46.77% | 46.77% | 0 pp |
| Micro-gaps &lt;5 mm | 0 | 0 | 0 |
| Ilhas internas | 0 | 0 | 0 |
| Scatter | 0.671 | 0.555 | -0.116 |
| Densidade H | 0.812 | 0.869 | 0.057 |
| Densidade V | 0.741 | 0.779 | 0.038 |
| Utilização | 53.23% | 53.23% | 0 pp |
| Tempo (ms) | 50.9 | 84.2 | 33.3 |

## Por chapa (desperdício %)

| Chapa | Antes | Depois |
|-------|-------|--------|
| 1 | 13.89% | 22.58% |
| 2 | 21.00% | 28.36% |
| 3 | 85.72% | 69.67% |
| 4 | 45.01% | 45.01% |
| 5 | 39.02% | 39.02% |
| 6 | 76.00% | 76.00% |

## Observações
- Densidade bbox ↑ H 0.812→0.869, V 0.741→0.779.
- Chapa 3: desperdício 85.72% → 69.67%.

## Regressão
- Contrato industrial: OK
- TCN estrutural: estável
