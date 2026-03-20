# Relatório Técnico: Sistema de Fabricação PI

**Data:** 20/03/2026
**Versão:** 1.0
**Projeto:** PIMO - Sistema de Projetos de Marcenaria

## 1. Visão Geral do Sistema PI

O sistema PI é um módulo paramétrico para geração de bases de cozinha com furação padronizada. Ele funciona como uma camada de fabricação alternativa ao sistema clássico, mantendo a mesma interface de exportação (boxManufacturing + tcnGenerator) sem alterar o comportamento do sistema clássico.

### Arquitetura do Sistema PI
- **Localização:** `src/data/moveisUnificados/pi/`
- **Integração:** Via `isPiBaseCabinetId()` no pipeline de fabricação
- **Independência:** Sistema PI tem suas próprias regras de furação e medidas
- **Compatibilidade:** Exporta para o mesmo pipeline de fabricação (CNC, PDF, etiquetas)

## 2. PanelTypes do Sistema PI

### 2.1 Tipos de Painéis Gerados

```typescript
// src/data/moveisUnificados/pi/manufacturing.ts
type PiPainelIndustrial = {
  id: string;
  tipo: string;           // Tipos específicos do PI
  largura_mm: number;
  altura_mm: number;
  espessura_mm: number;
  material: string;
  orientacaoFibra: "horizontal" | "vertical";
  quantidade: number;
  custo: number;
};
```

### 2.2 PanelTypes Específicos do Sistema PI

| PanelType | Descrição | ID Exemplo | Dimensões |
|-----------|-----------|------------|-----------|
| `cima` | Tampa superior | `pi-cima-1` | largura x profundidade |
| `fundo` | Fundo inferior | `pi-fundo-1` | largura x profundidade |
| `lateral_esquerda` | Lateral esquerda | `pi-lateral-esquerda-1` | profundidade x altura |
| `lateral_direita` | Lateral direita | `pi-lateral-direita-1` | profundidade x altura |
| `COSTA` | Painel traseiro | `pi-costa-1` | largura x altura |
| `gaveta_frente` | Frente de gaveta | `pi-gaveta-frente-{n}` | (largura-2) x altura_gaveta |

### 2.3 Dimensões Padrão do Sistema PI

```typescript
// src/data/moveisUnificados/pi/models.ts
export const PI_BASE_BOX_HEIGHT_MM = 760;    // Altura da caixa
export const PI_BASE_DEPTH_MM = 560;         // Profundidade da caixa
export const PI_BASE_FEET_HEIGHT_MM = 100;   // Altura dos pés
export const PI_BASE_TOTAL_HEIGHT_MM = 860;  // Altura total (caixa + pés)

// Larguras disponíveis
export const PI_BASE_WIDTHS_MM = [
  300, 350, 400, 450, 500, 550, 600, 650, 700, 750,
  800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200
];
```

## 3. HoleGroups e HoleTypes do Sistema PI

### 3.1 Tipos de Furos (DrillType)

```typescript
// src/core/types.ts
export type DrillType = 
  | "cavilha" 
  | "parafuso" 
  | "minifix" 
  | "dobradica" 
  | "dobradica_fixacao" 
  | "dobradica_parafuso_uniao" 
  | "corredica" 
  | "prateleira";
```

### 3.2 Sistema de Furação PI

```typescript
// src/data/moveisUnificados/pi/drilling.ts
type PiLateralDrillingInput = {
  alturaMm: number;
  profundidadeMm: number;
  side: "left" | "right";
  numeroGavetas: number;
  hasShelves: boolean;
  hasDoors: boolean;
  piSettings: PiModelSettings;
};
```

### 3.3 Configurações de Furação PI

```typescript
// src/data/moveisUnificados/pi/settings.ts
export type PiModelSettings = {
  espessuraMadeiraMm: number;           // Espessura da madeira
  ativarFuracaoPrateleiras: boolean;    // Furos de prateleira
  ativarFuracaoDobradicas: boolean;     // Furos de dobradiça
  ativarFuracaoGavetas: boolean;        // Furos de corrediça
  sistemaGavetas: "AvanTech YOU L" | "AvanTech YOU XL" | "AvanTech YOU M";
  comprimentoCorredicaMm: number;       // Comprimento da corrediça
  numeroGavetas: number;                // Número de gavetas (1-4)
  tipoFrente: "full_overlay" | "inset" | "overlay";
};
```

### 3.4 Parâmetros de Furação

```typescript
// src/data/moveisUnificados/pi/drilling.ts
const GRID_STEP_MM = 32;                // Passo da grade de furação
const GRID_FRONT_OFFSET_X_MM = 37;      // Offset frontal
const GRID_BACK_OFFSET_X_MM = 37;       // Offset traseiro
const FULL_HOLE_DEPTH_MM = 11;          // Profundidade total do furo
const MARK_HOLE_DEPTH_MM = 0.8;         // Profundidade do furo de marcação

const SLIDE_HOLES_X = {
  front: 37,    // Furo frontal da corrediça
  mark: 69,     // Furo de marcação
  rear: 293     // Furo traseiro da corrediça
};
```

## 4. DrawerSpecs e DoorSpecs do Sistema PI

### 4.1 Especificações de Gavetas (DrawerSpec)

```typescript
// src/3d/objects/DrawerFactory.ts
export type DrawerSpec = {
  id: string;
  widthM: number;
  heightM: number;
  depthM: number;
  thicknessM: number;
  x: number;
  y: number;
  z: number;
  rotY: number;
  drawerType: "normal" | "inset";
  leftSideWidth?: number;
  rightSideWidth?: number;
  bottomThickness?: number;
};
```

### 4.2 Especificações de Portas (DoorSpec)

```typescript
// src/3d/objects/DoorFactory.ts
export type DoorSpec = {
  id: string;
  widthM: number;
  heightM: number;
  thicknessM: number;
  x: number;
  y: number;
  z: number;
  rotY: number;
  hingeSide: "left" | "right" | "top" | "bottom";
  pivot: "left-edge" | "right-edge" | "top-edge" | "bottom-edge";
  isOpen: boolean;
  openDirection: "left" | "right" | "up" | "down";
};
```

### 4.3 Layout de Gavetas PI

```typescript
// src/data/moveisUnificados/pi/drilling.ts
type PiDrawerLayout = {
  frontHeightsMm: number[];    // Alturas das frentes das gavetas
  runnerLinesYMm: number[];    // Posições Y das linhas de corrediça
};

const DRAWER_FRONT_BASE_HEIGHTS_MM = [122, 178, 350, 350];
const HINGE_TARGETS_MM = [100, 400, 700];
```

## 5. Estrutura do BoxModel do Sistema PI

### 5.1 Identificação de Modelos PI

```typescript
// src/data/moveisUnificados/pi/models.ts
export function isPiBaseCabinetId(baseCabinetId: string | undefined | null): boolean {
  return typeof baseCabinetId === "string" && baseCabinetId.startsWith("pi-base-");
}
```

### 5.2 Geração de Painéis PI

```typescript
// src/data/moveisUnificados/pi/manufacturing.ts
export function gerarPaineisPi(box: BoxModule): PiPainelIndustrial[] {
  const settings = getPiSettings();
  const material = getIndustrialMaterial(getMaterialForBox(box, undefined) || "mdf_branco").nome;
  const espessura = getPiEspessuraMm(box.espessura);
  const largura = Number(box.dimensoes.largura) || 0;
  const altura = PI_BASE_BOX_HEIGHT_MM;
  const profundidade = PI_BASE_DEPTH_MM;
  const numeroGavetas = clampPiNumeroGavetas(settings.numeroGavetas);
  
  // Gera painéis conforme configuração PI
  return [
    { id: "pi-cima-1", tipo: "cima", largura_mm: largura, altura_mm: profundidade, ... },
    { id: "pi-fundo-1", tipo: "fundo", largura_mm: largura, altura_mm: profundidade, ... },
    { id: "pi-lateral-esquerda-1", tipo: "lateral_esquerda", largura_mm: profundidade, altura_mm: altura, ... },
    { id: "pi-lateral-direita-1", tipo: "lateral_direita", largura_mm: profundidade, altura_mm: altura, ... },
    { id: "pi-costa-1", tipo: "COSTA", largura_mm: largura, altura_mm: altura, ... },
    // Gavetas
    ...layout.frontHeightsMm.map((frontHeight, index) => ({
      id: `pi-gaveta-frente-${index + 1}`,
      tipo: "gaveta_frente",
      largura_mm: largura - FRONT_GAP_MM * 2,
      altura_mm: frontHeight,
      ...
    }))
  ];
}
```

### 5.3 Cálculo de Dimensões

- **Altura da caixa:** 760mm fixos
- **Profundidade:** 560mm fixos
- **Largura:** Variável (300-1200mm em passos de 50mm)
- **Espessura:** Configurável (padrão 19mm)
- **Número de gavetas:** 1-4 (configurável)

## 6. Pipeline de Fabricação do Sistema PI

### 6.1 Integração com boxManufacturing

```typescript
// src/core/manufacturing/boxManufacturing.ts
export function gerarPaineis(box: BoxModule, rules: RulesConfig): PainelIndustrial[] {
  if (isPiBaseCabinetId(box.baseCabinetId)) {
    return gerarPaineisPi(box, rules);
  }
  // Sistema clássico continua normalmente
}

export function gerarFerragens(box: BoxModule, rules: RulesConfig): FerragemIndustrial[] {
  if (isPiBaseCabinetId(box.baseCabinetId)) {
    return gerarFerragensPi(box, rules);
  }
  // Sistema clássico continua normalmente
}

export function gerarGavetas(box: BoxModule, rules: RulesConfig): GavetaIndustrial[] {
  if (isPiBaseCabinetId(box.baseCabinetId)) {
    return gerarGavetasPi(box, rules);
  }
  // Sistema clássico continua normalmente
}
```

### 6.2 Furação para Layout 3D

```typescript
// src/core/manufacturing/cutlistFromBoxes.ts
if (isPiBaseCabinetId(box.baseCabinetId) && (p.tipo === "lateral_esquerda" || p.tipo === "lateral_direita")) {
  drillHoles = buildPiUniversalLateralDrilling({
    alturaMm: p.altura_mm,
    profundidadeMm: p.largura_mm,
    side: p.tipo === "lateral_esquerda" ? "left" : "right",
    numeroGavetas: box.dimensoes.numeroGavetas ?? 3,
    hasShelves: box.dimensoes.prateleiras > 0,
    hasDoors: box.dimensoes.portas > 0,
    piSettings: getSettings().modeloPI
  });
}
```

### 6.3 Arrays Utilizados

- **TechnicalDrillHole[]** - Furos técnicos para o viewer 3D
- **PanelDrillHole[]** - Furos para o layout de corte
- **ViewerDrillMarkersByPanel** - Marcadores de furos para visualização

## 7. Pipeline de Fabricação para tcnGenerator

### 7.1 Dados que Chegam ao tcnGenerator

```typescript
// src/core/cnc/cncPipeline.ts
export function buildCncFromCutlistItems(
  project: unknown,
  items: CutlistItemForPieces[],
  sheet?: SheetDefinition,
  layoutOptions: CutLayoutEngineOptions = DEFAULT_CNC_LAYOUT_OPTIONS
) {
  // O pipeline recebe os mesmos CutlistItemForPieces
  // O sistema PI já está incorporado nos furos dos painéis
  const pieces = cutlistToPieces(items);
  const layoutResult = runCutLayout(pieces, sheet, layoutOptions);
  const cnc = exportCncFiles(project, layoutResult, []);
  return { pieces, layoutResult, cnc };
}
```

### 7.2 Dados que Falta para o TCN

Atualmente o sistema PI envia os furos corretamente para o layout 3D e para o layout_corte_pro, mas pode precisar de ajustes para:

1. **Formato de coordenadas:** Verificar se as coordenadas estão no sistema de referência correto
2. **Profundidades específicas:** Validar se as profundidades dos furos estão corretas para cada tipo
3. **Ordenação dos furos:** Garantir que os furos são processados na ordem correta
4. **Tipos de furos específicos:** Mapear corretamente os tipos de furos PI para os tipos CNC

## 8. Tratamento de Remoção de Componentes

### 8.1 Estados Atualizados

```typescript
// src/context/hooks/useBoxCrudActions.ts
const isPiModel = isPiBaseCabinetId(baseModel.id) || baseModel.grupoCatalogo === "pi";
if (isPiModel) {
  // Atualiza o número de gavetas nas configurações
  const piSettings = getSettings().modeloPI;
  // O sistema PI recalcula automaticamente os painéis e furos
}
```

### 8.2 O que Falta para o TCN Refletir Corretamente

1. **Recálculo de furos:** Quando uma gaveta é removida, os furos de corrediça precisam ser recalculados
2. **Atualização de dimensões:** As dimensões das gavetas restantes precisam ser recalculadas
3. **Sincronização de estados:** Garantir que o estado do sistema PI esteja sincronizado com o pipeline de fabricação
4. **Validação de consistência:** Verificar se as remoções mantêm a consistência das regras de furação

## 9. Diferenças entre Sistema Clássico e Sistema PI

### 9.1 Diferenças Funcionais

| Aspecto | Sistema Clássico | Sistema PI |
|---------|------------------|------------|
| **Altura da caixa** | Variável | Fixa (760mm) |
| **Profundidade** | Variável | Fixa (560mm) |
| **Largura** | Variável | Fixa em passos de 50mm |
| **Espessura** | Variável | Configurável (padrão 19mm) |
| **Número de gavetas** | Variável | 1-4 (configurável) |
| **Furação de prateleiras** | 32mm padrão | Configurável (ativado/desativado) |
| **Furação de dobradiças** | Configurável | Configurável |
| **Furação de corrediças** | Configurável | Configurável (AvanTech YOU) |
| **Sistema de medidas** | Livre | Padronizado |

### 9.2 Regras de Furação

| Tipo de Furo | Sistema Clássico | Sistema PI |
|--------------|------------------|------------|
| **Prateleira** | Grade 32mm | Grade 32mm (configurável) |
| **Corrediça** | Configurável | AvanTech YOU (configurável) |
| **Dobradiça** | Configurável | Configurável |
| **Parafuso** | Configurável | Configurável |

### 9.3 Sem Alterações no Sistema Clássico

- **Independência total:** O sistema PI não altera nenhum comportamento do sistema clássico
- **Mesma interface:** Ambos utilizam a mesma interface de exportação
- **Mesmo pipeline:** Ambos utilizam o mesmo pipeline de fabricação (boxManufacturing + tcnGenerator)

## 10. Conclusões e Recomendações

### 10.1 Pontos Fortes do Sistema PI

1. **Arquitetura limpa:** Sistema PI é completamente independente do clássico
2. **Integração transparente:** Utiliza o mesmo pipeline de fabricação sem alterações
3. **Configurações flexíveis:** Permite personalização de espessura, número de gavetas, etc.
4. **Furação padronizada:** Sistema de furação consistente e configurável

### 10.2 Pontos de Melhoria

1. **Validação de coordenadas:** Verificar se as coordenadas dos furos estão corretas para o tcnGenerator
2. **Recálculo de furos:** Implementar recálculo automático quando componentes são removidos
3. **Documentação:** Documentar melhor as diferenças entre os sistemas de furação
4. **Testes:** Implementar testes específicos para o pipeline de fabricação do sistema PI

### 10.3 Próximos Passos

1. **Testar integração completa:** Validar todo o pipeline de fabricação do sistema PI
2. **Corrigir coordenadas:** Ajustar eventuais problemas de coordenadas no tcnGenerator
3. **Implementar recálculo:** Garantir que remoções de componentes atualizem corretamente os furos
4. **Documentar diferenças:** Criar documentação detalhada das diferenças entre os sistemas

---

**Elaborado por:** Sistema de Análise Técnica
**Data:** 20/03/2026