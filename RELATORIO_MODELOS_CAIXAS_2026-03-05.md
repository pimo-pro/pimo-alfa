# Relatorio Tecnico - Modelos de Caixas

Data: 2026-03-05
Repositorio: c:\Users\Mofreita\pimo-v3

## 1) Escopo da analise

Foi realizada varredura completa em `src/` para identificar:
- Definicoes de modelos de caixas.
- Pontos de uso e montagem de caixas no fluxo do projeto.
- Possiveis duplicidades, fontes legadas e estruturas nao utilizadas.

## 2) Resultado principal (fonte unica dos modelos)

A fonte ativa e unificada dos modelos de caixas esta em:
- `c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts`

Compatibilidade mantida via re-export em:
- `c:\Users\Mofreita\pimo-v3\src\core\baseCabinets\models.ts`

Consumo no catalogo:
- `c:\Users\Mofreita\pimo-v3\src\catalog\catalogIndex.ts`

## 3) Inventario completo dos modelos encontrados

Total de modelos de caixas catalogados: **18**

| # | Modelo | ID | Caminho completo | Tipo | Dimensoes (LxAxP mm) | Portas | Gavetas | Prateleiras | Furos/Outros |
|---|---|---|---|---|---|---:|---:|---:|---|
| 1 | A1 20cm 0 portas | base-200-garravera | c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts | inferior/base | 200x800x600 | 0 | 0 | 5 | Furo suportado no builder/render (nao por modelo) |
| 2 | A2 30cm 1 porta | base-300-porta-2prateleiras | c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts | inferior/base | 300x720x600 | 1 | 0 | 2 | idem |
| 3 | A3 30cm 3 gavetas | base-300-3gavetas | c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts | inferior/base gaveteiro | 300x720x600 | 0 | 3 | 0 | idem |
| 4 | A4 40cm 3 gavetas | base-400-3gavetas | c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts | inferior/base gaveteiro | 400x720x600 | 0 | 3 | 0 | idem |
| 5 | A5 40cm 3 gavetas | base-400-porta-3gavetas-2prateleiras | c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts | inferior/base misto (ver problema) | 400x720x600 | 1 | 3 | 2 | idem |
| 6 | A6 50cm 3 gavetas | base-500-3gavetas | c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts | inferior/base gaveteiro | 500x720x600 | 0 | 3 | 0 | idem |
| 7 | A7 50cm 1 porta | base-500-porta-2prateleiras | c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts | inferior/base | 500x720x600 | 1 | 0 | 2 | idem |
| 8 | A8 60cm 2 portas | base-600-2portas-2prateleiras | c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts | inferior/base | 600x720x600 | 2 | 0 | 2 | idem |
| 9 | A9 60cm 3 gavetas | base-600-3gavetas | c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts | inferior/base gaveteiro | 600x720x600 | 0 | 3 | 0 | idem |
| 10 | A10 70cm 2 portas | base-700-2portas-2prateleiras | c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts | inferior/base | 700x720x600 | 2 | 0 | 2 | idem |
| 11 | A11 80cm 2 portas | base-800-2portas-2prateleiras | c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts | inferior/base | 800x720x600 | 2 | 0 | 2 | idem |
| 12 | A12 90cm 2 portas | base-900-2portas-2prateleiras | c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts | inferior/base | 900x720x600 | 2 | 0 | 2 | idem |
| 13 | A13 100cm 2 portas | base-1000-2portas-2prateleiras | c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts | inferior/base | 1000x720x600 | 2 | 0 | 2 | idem |
| 14 | A14 110cm 2 portas | base-1100-2portas-2prateleiras | c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts | inferior/base | 1100x720x600 | 2 | 0 | 2 | idem |
| 15 | A15 120cm 2 portas | base-1200-2portas-2prateleiras | c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts | inferior/base | 1200x720x600 | 2 | 0 | 2 | idem |
| 16 | A16 120cm 3 portas | base-1200-3portas-divisor-2prateleiras | c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts | inferior/base | 1200x720x600 | 3 | 0 | 2 | divisor vertical |
| 17 | A17 120cm 1 porta | base-1200-canto-direito | c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts | inferior/base canto | 1200x720x600 | 1 | 0 | 2 | canto direito |
| 18 | A18 120cm 1 porta | base-1200-canto-esquerdo | c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts | inferior/base canto | 1200x720x600 | 1 | 0 | 2 | canto esquerdo |

## 4) Onde os modelos estavam e onde estao agora

- Origem anterior (definicao direta):
  - `c:\Users\Mofreita\pimo-v3\src\core\baseCabinets\models.ts`
- Origem atual unificada (definicao direta):
  - `c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts`
- Compatibilidade preservada por re-export:
  - `c:\Users\Mofreita\pimo-v3\src\core\baseCabinets\models.ts`

## 5) Duplicados, nao utilizados e espalhados

### 5.1 Duplicados de modelos
- Nao foram encontrados IDs duplicados de modelos no catalogo ativo.
- Nao foram encontrados modelos equivalentes repetidos em arquivos distintos no fluxo ativo.

### 5.2 Estruturas legadas / nao utilizadas
- `c:\Users\Mofreita\pimo-v3\src\core\glb\glbRegistry.ts`
  - Contem IDs de catalogo (`cozinha-base-600`, etc.) que nao coincidem com os IDs atuais (`base-*`).
  - O mapa `GLB_REGISTRY` nao possui referencias externas (apenas uso interno da propria funcao), indicando risco de obsolescencia.
- `c:\Users\Mofreita\pimo-v3\src\templates\templatesIndex.ts`
  - `TEMPLATES` vazio.
- `c:\Users\Mofreita\pimo-v3\src\core\templates\templates.ts`
  - Lista inicial de templates vazia (persistencia existe, sem modelos predefinidos).

## 6) Modelos incompletos ou com problemas

1. Regra de combinacao (impacto funcional)
- Em `c:\Users\Mofreita\pimo-v3\src\context\projectState.ts`, as regras de `createWorkspaceBox` impedem coexistencia de portas/gavetas/prateleiras:
  - Se `gavetas > 0`, forca `portaTipo = sem_porta` e `prateleiras = 0`.
  - Se `portaTipo != sem_porta`, forca `gavetas = 0`.
  - Se `prateleiras > 0`, forca `gavetas = 0`.
- Impacto: o modelo `base-400-porta-3gavetas-2prateleiras` (A5) perde atributos ao ser instanciado.

2. Flags de canto/divisor sem uso claro (risco de incompletude)
- `verticalDivider`, `cornerRight`, `cornerLeft` estao definidos no modelo, mas sem consumo relevante no fluxo ativo alem do proprio registro/tipo.
- Pode indicar modelagem incompleta para cenarios de canto/divisor.

## 7) Arquivos/componentes relevantes que representam modelo de caixa no projeto

- Definicao de modelos:
  - `c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\boxModelsRegistry.ts`
  - `c:\Users\Mofreita\pimo-v3\src\core\baseCabinets\types.ts`
  - `c:\Users\Mofreita\pimo-v3\src\core\baseCabinets\index.ts`
- Adaptacao para catalogo e UI:
  - `c:\Users\Mofreita\pimo-v3\src\catalog\catalogIndex.ts`
  - `c:\Users\Mofreita\pimo-v3\src\catalog\catalogTypes.ts`
  - `c:\Users\Mofreita\pimo-v3\src\data\moveisUnificados\index.ts`
  - `c:\Users\Mofreita\pimo-v3\src\components\layout\left-panel\PainelMoveisUnificado.tsx`
- Instanciacao e comportamento de caixa:
  - `c:\Users\Mofreita\pimo-v3\src\context\ProjectProvider.tsx`
  - `c:\Users\Mofreita\pimo-v3\src\context\projectState.ts`
  - `c:\Users\Mofreita\pimo-v3\src\core\types.ts`
  - `c:\Users\Mofreita\pimo-v3\src\services\boxLayersService.ts`
  - `c:\Users\Mofreita\pimo-v3\src\core\manufacturing\boxManufacturing.ts`
  - `c:\Users\Mofreita\pimo-v3\src\3d\objects\BoxBuilder.ts`

## 8) Validacao apos unificacao

- Build executado com sucesso: `npm run build`.
- Nenhum modelo perdido no processo (18/18 preservados).

## 9) Conclusao

- O projeto agora possui um ponto unico de definicao de modelos de caixas em `src/data/moveisUnificados/boxModelsRegistry.ts`.
- O fluxo existente permaneceu compativel via `BASE_CABINET_MODELS`.
- Foram identificadas pendencias funcionais para evolucao: combinacao mista de portas+gavetas+prateleiras (A5) e uso efetivo de flags de canto/divisor.
