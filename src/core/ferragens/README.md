# Domínio de Ferragens

## Fonte oficial do catálogo

- **`core/ferragens/ferragens.ts`** — Catálogo de ferragens: tipo `Ferragem`, lista `FERRAGENS_DEFAULT`. Use para admin, fabricação e como base para listas industriais.

## Design (quantidades e preço por caixa)

- **`core/design/ferragens.ts`** — Função `buildFerragens(prateleiras, portaTipo, gavetas)` que devolve `Acessorio[]` com quantidade e preço unitário. Usado no cálculo de preço e resumo por móvel (design).

## Industriais (Cutlist / PDF / CNC)

- **`core/industriais/ferragensIndustriais.ts`** — Lista industrial de ferragens por caixa (`FerragemIndustrial`), combinando Component Types e o catálogo. Usado em Cutlist, PDF técnico e CNC.

## Resumo

| Módulo            | Uso principal                          |
|-------------------|----------------------------------------|
| ferragens/ferragens.ts | Catálogo (fonte oficial)              |
| design/ferragens.ts    | Quantidades e preços no design        |
| industriais/ferragensIndustriais.ts | Lista industrial (Cutlist/PDF/CNC) |
