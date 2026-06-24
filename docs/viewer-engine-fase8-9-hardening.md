# Viewer Engine — Fase 8/9 Hardening

## Objetivo

Consolidar a desmontagem segura do `ViewerCore` sem alterar comportamento industrial.
O `ViewerCore` continua a ser a facade pública e mantém compatibilidade com `window.viewerCore`.

## Módulos extraídos

### `measurement/`

- `internalRulerFacade.ts`: facade pública da régua interna.
- `internalRulerOverlaySync.ts`: sincronização entre seleção interna, cavidades e overlay.
- `measurementAnchorsBridge.ts`: criação e sincronização de anchors.
- `parametricRulerDistances.ts`: distâncias paramétricas box/parede/chão.

Responsabilidade: medições e dados auxiliares do viewer. Não gera cutlist, TCN ou peças industriais.

### `overlays/`

- `DimensionsOverlayController.ts`: lifecycle do overlay MC/print-ready.
- `SelectionOutlineController.ts`: outline azul de seleção de caixas/remates.
- `WallSelectionOutlineController.ts`: outline da parede selecionada.
- `bindViewerOverlayCoordinator.ts`: binding do refresh por frame.
- `viewerVisualFacades.ts`: facades visuais de orla/remate/hemati/rodapé.

Responsabilidade: visualização e overlays. Não altera geometria industrial nem posicionamento.

### `input/`

- `PointerPickingFacade.ts`: delegação fina para `ViewerRaycastSystem`.
- `neutralSelection.ts`: limpeza de seleções concorrentes.
- `viewerWindowEvents.ts`: lifecycle de eventos globais do viewer.

Responsabilidade: input, picking e seleção neutra. `ViewerRaycastSystem` mantém a ordem de picking/callbacks.

### `snapping/`

- `snappingFacade.ts`: API pública de snapping delegada ao `SmartSnapping`.
- `adminSnappingRules.ts`: aplicação e cleanup de regras admin.
- `smartAlignOverlayFacade.ts`: lifecycle do overlay visual de smart-align.
- `smartLayoutDepsFactory.ts`: deps de smart layout com `isSmartSnapEnabled: false`.

Responsabilidade: wiring/configuração. Não move nem altera `SmartSnapping`, `RemateSmartSnapping`,
`TransformConstraints`, `clampTransform` ou a ordem de `applyDuringTranslate`.

### `integration/`

- `viewerIndustrialSurface.ts`: tipos de superfície exposta pelo viewer para material sync e MC.

Responsabilidade: contrato type-only do lado viewer. O viewer-engine não importa `industrial/**`.

## Boundaries auditados

`viewer-engine/**` não deve importar:

- `industrial/**`
- `cnc/**`
- `fabrication/**`
- `cutlayout/**`

O teste `viewer-engine/core/viewerEngineBoundaries.test.ts` valida estes imports.

Exceções permitidas:

- nomes locais de visualização como `viewerCncDrillFilter.ts`, que não importam `core/cnc`.
- imports type-only em pipelines MC fora do viewer para `PrintReadyDimensions`.
- `industrial/viewerIntegration.ts` pode consumir tipos da surface do viewer para manter o boundary explícito.

## Gates antes de cortes profundos

Antes de mover qualquer algoritmo ou alterar ordem runtime:

- `npx tsc -b`
- lints dos ficheiros alterados
- testes pontuais de viewer/snapping/measurements
- smoke manual viewer: picking, seleção, overlays, transform controls, snapping visual
- export MC quando ativo
- regressão industrial/cutlist/TCN quando houver alteração de geometria ou posicionamento

## Zonas protegidas

Não alterar sem bateria visual/industrial maior:

- `clampTransform`
- `TransformConstraints`
- `SmartSnapping`
- `RemateSmartSnapping`
- ordem de `applyDuringTranslate`
- `window.viewerCore`
- pipelines TCN, cutlayout, fabrication, nesting, PIMO-TRAK e export industrial

## Próximos eixos possíveis

- `transforms/gizmo`: risco médio, impacto visual alto.
- `room`: risco baixo a médio, dependências cruzadas com picking.
- `materials/loaders`: risco baixo, geralmente isolável.
