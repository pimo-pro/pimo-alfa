# Benchmark CutLayout — mono 19 mm (20 peças)

## Entrada
- Fixture: `buildMono19BenchmarkScenario()`
- Manifest: `MONO19_BENCH_INPUT.json`
- Mono-espessura: 19 mm | Material: mdf_branco

## Comparativo

| Métrica | Antes | Depois | Δ |
|---------|-------|--------|---|
| Chapas | 4 | 3 | -1 |
| Desperdício médio/chapa | 54.09% | 38.79% | -15.3 pp |
| Micro-gaps &lt;5 mm | 0 | 0 | 0 |
| Ilhas internas | 0 | 0 | 0 |
| Scatter | 0.801 | 0.64 | -0.161 |
| Densidade H | 0.685 | 0.803 | 0.118 |
| Densidade V | 0.683 | 0.93 | 0.247 |
| Utilização | 45.91% | 61.21% | 15.3 pp |
| Tempo (ms) | 61.9 | 80.4 | 18.5 |

## Por chapa (desperdício %)

| Chapa | Antes | Depois |
|-------|-------|--------|
| 1 | 28.44% | 17.77% |
| 2 | 38.30% | 29.75% |
| 3 | 54.55% | 68.84% |

## Observações
- 1 chapa(s) eliminada(s).
- Desperdício médio ↓ 15.30 pp.
- Densidade bbox ↑ H 0.685→0.803, V 0.683→0.93.
- Estratégia: skyline → shelf.
- Chapa 1: desperdício 28.44% → 17.77%.
- Chapa 2: desperdício 38.30% → 29.75%.

## Regressão
- Contrato industrial: OK
- TCN estrutural: estável
