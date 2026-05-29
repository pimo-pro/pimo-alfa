# Sistema de Gavetas (Analise Completa)

## Arquitetura atual

O sistema de gavetas esta dividido em tres camadas principais:

1. **Dominio moderno de gavetas** em `src/core/drawers/`.
2. **Camada persistida/renderizada** em `WorkspaceBox.drawersLayer`, tipada por `DrawerLayerItem` em `src/models/BoxLayers.ts`.
3. **Pipeline industrial/exportacao** em `projectState`, `cutlistFromBoxes`, `drawerCutlistAdapter`, PDFs, CNC e nesting.

Na pratica, existem duas fontes de verdade parcialmente sobrepostas:

- `DrawerGroup` / `Drawer` / `DrawerCalculatedSpecs`, gerados por `generateDrawerGroup`.
- `DrawerLayerItem[]`, guardado dentro de cada `WorkspaceBox` e usado pelo Viewer, UI e parte da producao.

O fluxo mais moderno e:

```text
UI / catalogo
  -> WorkspaceBox.gavetas / drawerType / drawerHeightMode
  -> regenerateLayersForBox()
  -> generateDrawerGroup()
  -> drawerGroupToLayerItems()
  -> WorkspaceBox.drawersLayer
  -> Viewer / ProjectState / cutlist parcial
```

O fluxo industrial antigo ainda existe:

```text
BoxModule.gavetas / alturaGaveta
  -> gerarModeloIndustrial()
  -> gerarPaineis() / gerarGavetas() / gerarFerragens()
  -> PDFs, paineis industriais e alguns totais
```

Esta duplicidade e o principal ponto fraco estrutural do sistema.

## Ficheiros envolvidos

### Nucleo de gavetas

- `src/core/drawers/DrawerParametrics.ts`: calculos parametricos de frente, corpo, laterais, fundo, traseira, folgas e bounding box.
- `src/core/drawers/Drawer.ts`: modelo `Drawer`, criacao das pecas e estado de movimento.
- `src/core/drawers/DrawerGroup.ts`: distribuicao vertical, modos de altura e layout do grupo.
- `src/core/drawers/DrawerGenerationService.ts`: geracao automatica de um grupo de gavetas a partir da caixa.
- `src/core/drawers/DrawerMotionService.ts`: abertura, animacao logica e helpers de estado.
- `src/core/drawers/DrawerBomService.ts`: extracao de pecas e ferragens para BOM, mas sem integracao completa no pipeline atual.
- `src/core/drawers/adapters/drawerGroupToLayerItems.ts`: conversao entre dominio de gavetas e `DrawerLayerItem`.
- `src/core/drawers/index.ts`: exports publicos.

### Estado e acoes

- `src/core/types.ts`: `BoxModule` e `WorkspaceBox` guardam `gavetas`, `alturaGaveta`, `drawerHeightMode`, `drawerType` e `drawersLayer`.
- `src/context/projectState.ts`: cria caixas, converte `WorkspaceBox` para `BoxModule`, calcula cutlist e precos.
- `src/context/hooks/useLayerActions.ts`: acoes de prateleiras, portas, gavetas, materiais, abertura e regeneracao.
- `src/services/boxLayersService.ts`: gera `doorsLayer` e `drawersLayer` para cada caixa.

### Viewer

- `src/3d/objects/DrawerFactory.ts`: converte `DrawerLayerItem` para `DrawerSpec` em metros e cria o grupo 3D.
- `src/3d/objects/BoxAssembler.ts`: adiciona gavetas ao grupo da caixa.
- `src/3d/objects/BoxUpdater.ts`: atualiza gavetas incrementalmente por fingerprint.
- `src/3d/objects/BoxBuilder.ts`: camada oficial de construcao parametrica; delega gavetas para `DrawerFactory`.
- `src/components/layout/workspace/ContextMenu.tsx`: usa selecao por `drawerLayerId`.
- `src/3d/viewer-engine/raycast/ViewerRaycastSystem.ts`, `ViewerCore.ts`, `EdgeOutlineSystem.ts`: selecao, highlight e contexto.

### UI

- `src/components/layout/left-panel/HomeLeftPanelSelected.tsx`: stepper de numero de gavetas, painel de opcoes e toggle PI.
- `src/components/layout/left-panel/BoxLayersPanel.tsx`: edicao de cada gaveta, abertura, remocao, material e tipo normal/pro.
- `src/components/layout/bottom-info-toolbar/BottomInfoToolbar.tsx`: labels de partes de gaveta no painel de componentes.
- `src/components/panels/CutlistPanel.tsx`: mostra gavetas via `useCutlistData`.
- `src/components/panels/FerragensPanel.tsx`: mostra ferragens industriais.
- `src/components/admin/SystemSettingsBase.tsx`: configura defaults globais de gavetas e PI.
- `src/components/admin/RulesAdminPage.tsx`: configura furacao de corredica.

### Producao, cutlist e exportacao

- `src/services/drawerCutlistAdapter.ts`: transforma `DrawerLayerItem[]` em pecas de corte: frente, laterais, fundo e traseira.
- `src/core/manufacturing/cutlistFromBoxes.ts`: gera cutlist industrial geral, furos e QR.
- `src/core/manufacturing/boxManufacturing.ts`: modelo industrial legado com `gerarPaineis`, `gerarGavetas`, `gerarFerragens`.
- `src/core/fabrication/buildCutlistItemsForIndustrialExport.ts`: fonte usada por CNC/TCN/nesting industrial.
- `src/hooks/useGerarArquivoHandlers.ts`: exportacao PDF, CNC/TCN, ZIP e nesting.
- `src/core/pdf/gerarPdfTecnico.ts`, `pdfTechnical.ts`, `pdfUnified.ts`: PDFs tecnicos e unificados.
- `src/core/cutlayout/cutLayoutProPieceNaming.ts`: nomes industriais para pecas de gaveta no nesting.

### Furacao, PI e regras especiais

- `src/core/drilling/drillingService.ts`: faces internas A/B e furos de corredica para pecas de gaveta.
- `src/modules/drilling/drillingAdapter.ts`: contexto de modulo, regras efetivas e conversao para `PanelDrillHole`.
- `src/data/moveisUnificados/pi/settings.ts`: configuracoes PI de gavetas.
- `src/data/moveisUnificados/pi/drilling.ts`: furacao PI universal, grelha 32 mm e corredicas.
- `src/data/moveisUnificados/pi/manufacturing.ts`: paineis, gavetas e ferragens PI.
- `src/core/wardrobe/wardrobeRules.ts`: gavetas inferiores em roupeiros H/J.

### Testes e documentacao existente

- `src/validation/industrialFase7.test.ts`: valida faces A/B, furacao e contexto de prateleira/gaveta.
- `src/validation/shelfDistribution.test.ts`: garante que prateleiras nao mudam no Viewer por haver gavetas.
- `CHECKLIST_VALIDACAO_GAVETAS.md`, `REWRITE_TOTAL_GAVETAS_MARCENARIA_REAL.md`, `GUIA_INTEGRACAO_DRAWER_BOM_PDF.md`: documentacao historica da reconstrucao.

## Regras existentes

### Regras parametricas atuais

Em `DrawerParametrics.ts`:

- Frente: `boxInternalWidth - 2mm`, `drawerHeight - 2mm`, espessura fixa `19mm`.
- Corpo: `boxInternalWidth - 14mm`, `drawerHeight - 6mm`, `boxInternalDepth - 30mm`.
- Laterais: espessura fixa `15mm`, altura do corpo, profundidade do corpo.
- Fundo: espessura fixa `10mm`, largura `bodyWidth - 10mm`, profundidade `bodyDepth - 10mm`.
- Traseira: espessura fixa `15mm`, largura do corpo, altura `bodyHeight - 10mm`.
- Folgas: frente `1mm` por lado, corredica `7mm` por lado, encaixes do fundo `5mm`.

Em `DrawerGenerationService.ts`:

- `boxInternalWidth = boxWidth - 2 * boxThickness`.
- `boxInternalHeight = boxHeight`.
- `boxInternalDepth = boxDepth`.
- A posicao base da gaveta e `z = boxDepth / 2 - frontThickness`.
- O grupo pode receber `originX` e `originY`, usado em roupeiros.

Em `DrawerGroup.ts`:

- `equal`: todas as alturas iguais.
- `top_small_mid_medium_bottom_large`: 2 gavetas = 40/60; 3+ = topo 20%, fundo 40%, meio dividido pelo restante.
- `custom`: usa `customHeights`, mas sem validacao de soma contra altura disponivel.

### Regras globais de settings

Em `SettingsSchema.gavetas`:

- `gavetaNormalBaseEspessuraMm`
- `gavetaProBaseEspessuraMm`
- `gavetaFolgaLateralMm`
- `gavetaProfundidadesDisponiveisMm`
- `gavetaAlturaModoPadrao`

Problema: a maior parte destes campos nao e usada pelo dominio real. `DrawerParametrics.ts` mantem constantes internas hardcoded e ignora `_availableDepths`.

### Regras de furacao

Em `RulesConfig.furos.tecnicos.corredica`:

- `enabled`
- `offsetFrente`
- `offsetFundo`
- `alturaRelativaFundo`
- `offsetVerticalAdicional`
- `diametro`
- `profundidade`

Em `drillingService.ts`, `calcCorredica` aplica furos apenas em:

- `gaveta_lat_esq`
- `gaveta_lat_dir`
- `gaveta`

Isto evita furar laterais do modulo para corredica no fluxo generico. Para PI, a furacao de corredica nas laterais do modulo e tratada por `buildPiUniversalLateralDrilling`.

### Regras PI

Em `data/moveisUnificados/pi`:

- PI tem altura e profundidade fixas (`760mm`, `560mm`).
- A furacao de corredica PI e universal e independe de `drawersLayer`.
- `piHideDrawerHoles` oculta apenas furos de corredica nas laterais, mantendo grelha 32 mm e dobradicas.
- `gerarGavetasPi` usa `settings.modeloPI.numeroGavetas`, enquanto paineis/ferragens usam frequentemente `box.drawersLayer.length`.

## Fluxo de funcionamento

### Criacao e regeneracao

1. O utilizador altera o numero de gavetas no painel esquerdo.
2. `setGavetas` define `gavetas`, remove portas e prateleiras quando `gavetas > 0`.
3. `regenerateLayersForBox` chama `generateDrawerGroup`.
4. `drawerGroupToLayerItems` converte o dominio para `drawersLayer`.
5. O `WorkspaceBox` passa a persistir a camada gerada.

### Edicao

`BoxLayersPanel` permite editar:

- largura, altura, profundidade e espessura da frente;
- curso de abertura;
- material;
- tipo `normal` ou `pro`;
- estado aberto/fechado;
- remocao da gaveta.

Quando a altura muda em modo `custom`, `useLayerActions.updateDrawerLayerItem` reposiciona manualmente as gavetas, mas nao recalcula todo o dominio com as mesmas regras de `DrawerGroup`.

### Viewer

1. `DrawerLayerItem` e convertido para `DrawerSpec` por `buildDrawerSpecs`.
2. `createDrawerObject` cria um grupo `drawer-layer-{id}`.
3. Dentro dele cria `drawer-body-{id}`, que contem frente, laterais, fundo e traseira.
4. A abertura move o grupo interno no eixo Z.
5. A animacao usa `drawerOpenState`, `drawerPositionState` e `requestAnimationFrame`.

### Producao e cutlist

Ha dois caminhos:

- `projectState.buildBoxDesign` usa `cutlistComPrecoFromBox`, remove `gaveta_frente`/`gaveta` quando ha `drawersLayer` e adiciona as pecas de `drawerCutlistAdapter`.
- Exportacoes industriais usam `buildCutlistItemsForIndustrialExport`, que chama `buildGlobalQrCutlistMerged`, que por sua vez chama `cutlistComPrecoFromBox`.

Este segundo caminho nao passa por `projectState.buildBoxDesign`, o que cria risco de exportar uma visao diferente da cutlist mostrada no projeto.

## Problemas identificados

### 1. Duas fontes de verdade

O dominio moderno (`DrawerGroup`) gera a geometria correta, mas a producao antiga (`boxManufacturing`) ainda gera gavetas proprias. Isto causa divergencia entre:

- Viewer;
- ProjectState.cutList;
- CutlistPanel;
- PDF tecnico;
- PDF cutlist;
- CNC/TCN;
- nesting.

### 2. `DrawerBomService` nao esta integrado

O servico foi criado para extrair frente, laterais, fundo, traseira e ferragens, mas o pipeline real usa `drawerCutlistAdapter` ou `boxManufacturing`. O guia `GUIA_INTEGRACAO_DRAWER_BOM_PDF.md` descreve integracao futura, nao estado atual.

### 3. Settings de gavetas sao quase decorativos

`SystemSettingsBase` permite configurar folga lateral, espessuras e profundidades disponiveis, mas `DrawerParametrics.ts` usa constantes fixas:

- `FRONT_THICKNESS_MM = 19`
- `SIDE_THICKNESS_MM = 15`
- `BOTTOM_THICKNESS_MM = 10`
- `BACK_THICKNESS_MM = 15`
- `SIDE_GAP_MM = 7`

Alem disso, `calculateDrawerSpecs` recebe `_availableDepths`, mas nao usa o array para escolher profundidade nominal.

### 4. Tipo `pro` esta incompleto

`Drawer.type === "pro"` altera `sideMaterial` para `aluminum`, mas os calculos continuam a gerar laterais, fundo e traseira como no tipo normal.

Depois, alguns adaptadores ignoram laterais/fundo em `pro`, enquanto o Viewer ainda pode renderizar dimensoes geradas. Isto cria diferenca entre renderizacao, BOM e producao.

### 5. Inconsistencia entre comentarios/documentos e codigo real

Documentos historicos falam em frente avancada `19mm` para fora. O codigo atual posiciona a origem em `boxDepth / 2 - frontThickness` e a frente em `frontThickness / 2`, resultando em frente flush com o plano frontal.

Flush e coerente com o comentario de `generateDrawerGroup`, mas contradiz partes da documentacao antiga.

### 6. Geracao industrial antiga so conhece frente

Em `boxManufacturing.gerarPaineis`, para gavetas genericas e adicionado apenas `gaveta_frente`.

As pecas internas so entram em `projectState.buildBoxDesign` via `drawerCutlistAdapter`, mas varios relatorios e PDFs usam `gerarModeloIndustrial` diretamente.

### 7. Exportacao CNC/nesting pode perder pecas internas da gaveta

`buildCutlistItemsForIndustrialExport` usa `buildGlobalQrCutlistMerged`, que regenera a partir de `cutlistComPrecoFromBox`.

Como `cutlistComPrecoFromBox` nao aplica o filtro/adaptacao de `buildBoxDesign`, ha risco elevado de exportar so frentes de gaveta no CNC/TCN/nesting, enquanto a cutlist do estado pode mostrar frente, laterais, fundo e traseira.

### 8. CutlistPanel e PDFs podem divergir

`useCutlistData` chama `gerarModeloIndustrial` diretamente e mostra `modelo.gavetas`, nao a cutlist final com `drawerCutlistAdapter`.

`gerarPdfTecnico.ts` tambem percorre `modelo.paineis`, o que tende a listar apenas `gaveta_frente` no modelo generico.

### 9. Ferragens contam de formas diferentes

Ha pelo menos tres modelos de ferragens:

- `buildFerragens` em `core/ferragens/ferragens.ts`: `corredica` com quantidade igual ao numero de gavetas.
- `boxManufacturing.gerarFerragens`: `corredicas = gavetas * 2`.
- `DrawerBomService`: `slide` com quantidade `2` por gaveta, mais parafusos e puxador.

Isto afeta totais financeiros, PDFs e listas industriais.

### 10. Distribuicao custom sem invariantes fortes

`calculateDrawerHeights` aceita `customHeights` sem garantir:

- soma igual a altura disponivel;
- altura minima;
- limites dentro do vao;
- nao sobreposicao.

`updateDrawerLayerItem` recalcula posicoes custom com `box.dimensoes.altura - 10`, enquanto `DrawerGroup` usa noutros pontos `boxHeight` e offset `0`. Isto introduz formulas diferentes.

### 11. Validacao insuficiente

`canBoxHaveDrawers` valida minimos simples, mas nao e chamado no fluxo principal de `setGavetas`.

`validateDrawerSpecs` so valida relacao frente/corpo. Nao valida:

- altura minima real;
- profundidade compativel com corredicas disponiveis;
- curso maximo;
- colisao com portas/prateleiras/divisores;
- gavetas dentro da caixa;
- pecas `pro`.

### 12. Abertura e colisoes

`canOpenDrawer` devolve sempre `{ canOpen: true }`. Nao ha verificacao de colisao com:

- outra gaveta aberta;
- portas;
- parede/sala;
- caixas vizinhas;
- objetos CAD internos.

### 13. IDs e paineis

`panelIds.gavetas` guarda IDs por gaveta, mas `drawerCutlistAdapter` cria IDs proprios com base em `parentBoxId` e indice. Isto pode quebrar estabilidade de QR/labels quando se remove/reordena gavetas.

### 14. Persistencia parcial do dominio

O projeto guarda `drawersLayer`, mas nao guarda `DrawerGroup` nem `specs` completos. Isto e aceitavel se `DrawerLayerItem` for assumido como fonte unica, mas hoje parte do dominio ainda tenta existir como fonte propria.

## Impacto na producao

O impacto principal e a possibilidade de a producao receber dados diferentes do Viewer:

- ProjectState pode conter pecas internas via `drawerCutlistAdapter`.
- Exportacoes globais podem regenerar a cutlist e perder laterais/fundo/traseira.
- Paineis de UI podem mostrar gavetas industriais antigas.
- Ferragens podem ser subcontadas ou duplicadas conforme o painel/export.

Risco pratico:

- CNC/TCN incompleto para gavetas.
- Nesting sem pecas internas.
- PDF tecnico incompleto.
- Orcamento incorreto por faltar material de laterais/fundo/traseira.
- Quantidade de corredicas inconsistente.

## Impacto no Viewer

O Viewer esta mais avancado que o pipeline industrial:

- Renderiza frente, laterais, fundo e traseira.
- Move frente e corpo juntos.
- Permite abrir gavetas individualmente.
- Usa `DrawerLayerItem` com material e posicoes locais.

Riscos:

- `DrawerSpec` fingerprint nao inclui todas as subdimensoes/posicoes das pecas. Alteracoes em laterais/fundo/traseira podem nao forcar rebuild se nao mudarem campos incluidos.
- A animacao guarda estado em mapas globais por ID. Se IDs forem reciclados, pode haver estado visual herdado.
- O tipo `pro` pode ser renderizado como gaveta normal, apesar da producao poder ignorar algumas pecas.

## Impacto no nesting

O nesting depende dos itens passados para `cutlistToPieces`.

Se a origem for `project.cutListComPreco`, as pecas internas podem existir. Se a origem for `buildCutlistItemsForIndustrialExport`, ha risco de usar apenas o modelo industrial antigo, que nao inclui laterais/fundo/traseira de gaveta generica.

`cutLayoutProPieceNaming.ts` ja conhece:

- `gaveta_frente`
- `gaveta_fundo`
- `gaveta_lat_esq`
- `gaveta_lat_dir`
- `gaveta_traseira`

Portanto o naming esta preparado. O problema e garantir que estes tipos chegam sempre ao nesting.

## Dependencias internas

Principais dependencias do sistema:

- `WorkspaceBox` e `BoxModule` em `src/core/types.ts`.
- `ProjectState` e `buildDesignState` em `src/context/projectState.ts`.
- `regenerateLayersForBox` em `src/services/boxLayersService.ts`.
- `DrawerLayerItem` em `src/models/BoxLayers.ts`.
- `DrawerFactory` e `BoxAssembler` no Viewer.
- `cutlistComPrecoFromBox` e `buildGlobalQrCutlistMerged`.
- `buildPanelDrillingResult` e `calculateTechnicalDrillingsForPiece`.
- `settings.gavetas`, `settings.modeloPI` e `rules.furos.tecnicos.corredica`.

## Proposta de reconstrução (modelo semelhante ao sistema de portas)

O sistema de portas esta mais claro porque usa `DoorLayerItem` como fonte de verdade e projeta para o Viewer via `DoorSpec`.

Para gavetas, a reconstrucao recomendada e:

1. Definir `DrawerLayerItem` como fonte unica persistida.
2. Remover dependencia de `box.gavetas + alturaGaveta` para producao, deixando estes campos apenas como inputs de geracao.
3. Criar um `DrawerSpec` industrial unico, derivado de `DrawerLayerItem`, com todas as pecas.
4. Substituir `boxManufacturing.gerarGavetas` e a geracao antiga de `gaveta_frente` por um adaptador unico.
5. Integrar `DrawerBomService` ou fundi-lo com `drawerCutlistAdapter`, evitando dois servicos para a mesma funcao.
6. Fazer `buildCutlistItemsForIndustrialExport` consumir a mesma fonte que `ProjectState.cutList`.
7. Regras globais de gavetas devem alimentar `DrawerParametrics`, sem constantes hardcoded.
8. Implementar invariantes:
   - soma de alturas dentro do vao;
   - altura minima;
   - profundidade nominal escolhida da lista disponivel;
   - tipo normal/pro com pecas reais coerentes;
   - ferragens unificadas;
   - IDs estaveis por subpeca.
9. Criar testes unitarios especificos de drawers, nao apenas testes genericos de furacao.

## Lista de ações recomendadas

### Prioridade alta

- Unificar a fonte de verdade da producao: todos os exports devem usar a mesma cutlist final.
- Corrigir `buildCutlistItemsForIndustrialExport` para incluir frente, laterais, fundo e traseira das gavetas.
- Decidir se `DrawerBomService` substitui `drawerCutlistAdapter` ou se deve ser removido.
- Corrigir contagem de corredicas: escolher uma convencao unica, preferencialmente `2` por gaveta.
- Fazer `gerarPdfTecnico`, `pdfUnified`, `CutlistPanel` e CNC usarem a mesma lista final.

### Prioridade media

- Ligar `settings.gavetas` ao dominio parametrico.
- Usar `gavetaProfundidadesDisponiveisMm` para escolher profundidade nominal real.
- Implementar comportamento real para `drawerType: "pro"`.
- Validar `customHeights` com soma, minimos e limites.
- Garantir IDs estaveis por subpeca de gaveta.

### Prioridade baixa

- Atualizar documentacao antiga que fala em frente avancada para fora se o modelo oficial for flush.
- Adicionar UI dedicada para alturas custom com aviso de soma.
- Implementar `canOpenDrawer` com colisoes reais.
- Adicionar testes visuais e industriais para roupeiros H/J com gavetas inferiores.

## Conclusao

O Viewer e o dominio `src/core/drawers` ja tem uma base forte para gavetas reais, mas o sistema ainda nao esta industrialmente fechado.

O maior problema nao e calculo geometrico isolado. O problema e a coexistencia de pipelines:

- dominio moderno para renderizacao e parte da cutlist;
- modelo industrial antigo para PDFs, totais e exportacoes;
- PI com regras proprias;
- settings parcialmente desligadas.

A reconstrucao deve seguir o padrao do sistema de portas: uma fonte de verdade persistida, uma projecao para Viewer, uma projecao para producao e testes que garantam que todos os caminhos produzem as mesmas pecas.
