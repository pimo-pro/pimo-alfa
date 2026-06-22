# Relatório técnico — CutLayout Impact Benchmark

| Cenário | Modo | Chapas | Desperdício médio | Micro-gaps | Ilhas | Scatter | Utilização | Tempo (ms) |
|---------|------|--------|-------------------|------------|-------|---------|------------|------------|
| TEST_1_IMPORT | IMPORT | 1→1 | 92.25%→92.25% | 0→0 | 0→0 | 0.989→0.989 | 7.75%→7.75% | 16.4→25.3 |
| SPM_FULL_INDUSTRIAL | SPM | 3→3 | 72.76%→72.76% | 0→0 | 0→0 | 0.905→0.882 | 27.24%→27.24% | 23.4→44.3 |
| MPM_DUAL_BOX | MPM | 4→4 | 65.31%→65.31% | 0→0 | 0→0 | 0.802→0.875 | 34.69%→34.69% | 31666.7→31694.2 |

## Observações
- SPM_FULL_INDUSTRIAL: desperdício mais concentrado (scatter 0.905 → 0.882).

## Regressão SPM/MPM/PDF
- TCN estrutural: estável
- Contrato industrial/etiquetas: OK
