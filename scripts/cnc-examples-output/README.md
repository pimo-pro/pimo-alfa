# Exemplos CNC (TCN + KDT) para validação na máquina

Estes ficheiros foram gerados com o mesmo código usado na exportação do projeto (ALBATROS/EDICAD).

## Conteúdo

| Ficheiro | Espessura | Conteúdo |
|----------|-----------|----------|
| `job_exemplo_19mm.tcn` | 19 mm | 2 peças (600×400, 500×300); Z segurança +10, profundidade -19 |
| `job_exemplo_19mm.kdt` | 19 mm | 8 furos (4 por peça) |
| `job_exemplo_10mm.tcn` | 10 mm | 2 peças (300×200, 250×150); Z segurança +10, profundidade -10 |
| `job_exemplo_10mm.kdt` | 10 mm | 8 furos (4 por peça) |

## Compatibilidade TCN (referência máquina)

- **Z**: positivo = segurança (+10 mm); negativo = profundidade de corte (-19 ou -10 mm).
- **Header**: `::UNm DL=... DH=... DS=...` com DS = espessura do painel.
- **W#81**: posicionamento em X,Y com Z=10 (segurança).
- **W#89{ ::WTs ... }W**: bloco de ferramenta (#205=113, #2002=21000, #1001=100, #2005=3).
- **W#2201{ ::WTl X1= Y1= X2= Y2= Z= }W**: segmentos de contorno com Z negativo (corte).
- **SIDE**: no início de cada sheet (`::LF`, `::HF`, `::SF` com valor da espessura) e no final do ficheiro (`SIDE#1`, `::SF`, `::HF` com espessura).

## Regenerar exemplos

A partir da raiz do projeto:

```bash
npx tsx scripts/generate-cnc-examples.ts
```

Os ficheiros serão escritos nesta pasta. Se preferir, use a exportação CNC na aplicação (painel direito → Exportar CNC) com um projeto que tenha peças de 19 mm e 10 mm.
