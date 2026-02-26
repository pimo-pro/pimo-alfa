# Checklist de Validação: Sistema de Gavetas Corrigido

Use este checklist para validar que o sistema de gavetas está funcionando corretamente com as regras de marcenaria implementadas.

---

## ✅ 1. VALIDAÇÕES DE DIMENSÕES

### 1.1 - Frente da Gaveta

**Teste:**
```typescript
const box = { dimensoes: { largura: 600, altura: 800, profundidade: 450 } };
const drawerGroup = generateDrawerGroup({
  boxWidth: 600,
  boxHeight: 800,
  boxDepth: 450,
  boxThickness: 19,
  boxId: 'test',
  drawerCount: 1,
  drawerType: 'normal',
  heightMode: 'equal',
  availableDepths: [400],
});

const drawer = drawerGroup.drawers[0];
```

**Validações:**
- [ ] `drawer.specs.front.width === 598` (600 - 2mm)
- [ ] `drawer.specs.front.height === 798` (800 - 2mm)
- [ ] `drawer.specs.front.thickness === 19`
- [ ] `drawer.specs.gaps.frontGap === 1`

### 1.2 - Corpo da Gaveta

**Validações:**
- [ ] `drawer.specs.body.width === 586` (600 - 14mm)
- [ ] `drawer.specs.body.height === 800`
- [ ] `drawer.specs.body.depth <= 450`
- [ ] `drawer.specs.gaps.sideGap === 7`

### 1.3 - Diferença Frente ↔ Corpo

**Validações:**
- [ ] `drawer.specs.front.width - drawer.specs.body.width === 12` (exato!)
- [ ] Validação automática: `validateDrawerSpecs(drawer.specs) === true`

### 1.4 - Laterais

**Validações:**
- [ ] `drawer.specs.leftSide.width === 15` (ou 0 se tipo PRO)
- [ ] `drawer.specs.leftSide.height === 800`
- [ ] `drawer.specs.leftSide.depth === drawer.specs.body.depth`
- [ ] `drawer.specs.rightSide` tem as mesmas dimensões

### 1.5 - Fundo

**Validações:**
- [ ] `drawer.specs.bottom.width === 576` (586 - 10mm, encaixe 5mm cada lado)
- [ ] `drawer.specs.bottom.height === drawer.specs.body.depth - 10` (encaixes frente+traseira)
- [ ] `drawer.specs.bottom.thickness === 10`
- [ ] `drawer.specs.gaps.bottomSlots.front === 5`
- [ ] `drawer.specs.gaps.bottomSlots.sides === 5`
- [ ] `drawer.specs.gaps.bottomSlots.back === 5`

### 1.6 - Traseira

**Validações:**
- [ ] `drawer.specs.back.width === 586` (= body width)
- [ ] `drawer.specs.back.height === 790` (800 - 10mm)
- [ ] `drawer.specs.back.thickness === 19`

---

## ✅ 2. VALIDAÇÕES DE POSICIONAMENTO

### 2.1 - Frente Colada ao Corpo

**Teste:**
```typescript
const front = drawer.pieces.front;
const body = drawer.pieces.body;
```

**Validações:**
- [ ] `front.positionX === 0` (centro, alinhada com corpo)
- [ ] `front.positionY === 0` (centro, alinhada com corpo)
- [ ] `front.positionZ > 0` (avança para fora)
- [ ] `front.positionZ === 19 + 19/2 === 28.5` (19mm offset + metade da espessura)
- [ ] Não há gap entre frente e corpo (coladas)

### 2.2 - Laterais Encostadas

**Validações:**
```typescript
const bodyWidth = 586;
const sideThickness = 15;

// Lateral esquerda
- [ ] leftSide.positionX === -bodyWidth/2 + sideThickness/2 === -285.5
- [ ] leftSide.positionY === 0
- [ ] leftSide.positionZ === 0

// Lateral direita
- [ ] rightSide.positionX === bodyWidth/2 - sideThickness/2 === 285.5
- [ ] rightSide.positionY === 0
- [ ] rightSide.positionZ === 0
```

### 2.3 - Fundo Embaixo com Encaixe

**Validações:**
```typescript
const bodyHeight = 800;
const bottomThickness = 10;
const frontThickness = 19;
const bottomSlotFront = 5;

- [ ] bottom.positionX === 0 (centro)
- [ ] bottom.positionY === -bodyHeight/2 + bottomThickness/2 === -395
- [ ] bottom.positionZ === -frontThickness + bottomSlotFront === -14
```

### 2.4 - Traseira no Fundo

**Validações:**
```typescript
const bodyDepth = 400;
const backThickness = 19;

- [ ] back.positionX === 0 (centro)
- [ ] back.positionY === 0 (centro vertical, mas 10mm mais curta)
- [ ] back.positionZ === -bodyDepth/2 + backThickness/2 === -190.5
```

---

## ✅ 3. VALIDAÇÕES DE GEOMETRIA (Sem Gaps)

### 3.1 - Laterais Tocam o Fundo

**Cálculo:**
```typescript
// Borda inferior da lateral
const lateralBottom = -bodyHeight/2 = -400

// Topo do fundo
const bottomTop = bottom.positionY + bottomThickness/2
              = -395 + 5 = -390

// GAP
const gap = lateralBottom - bottomTop = -400 - (-390) = -10mm ✅
// Negativo significa que a lateral VAI ALÉM do fundo (correto, o fundo está DENTRO)
```

**Validação:**
- [ ] Laterais vão até o fundo (não flutuam)

### 3.2 - Fundo Entre as Laterais

**Cálculo:**
```typescript
// Laterais
leftSide.positionX = -285.5 (borda externa: -285.5 - 15/2 = -293)
rightSide.positionX = 285.5 (borda externa: 285.5 + 15/2 = 293)

// Fundo
bottomWidth = 576
leftEdge = -576/2 = -288
rightEdge = 576/2 = 288

// Encaixe
leftGap = -288 - (-293) = 5mm ✅
rightGap = 293 - 288 = 5mm ✅
```

**Validação:**
- [ ] Fundo entra 5mm em cada lateral (encaixe)

### 3.3 - Traseira Entre as Laterais

**Cálculo:**
```typescript
// Traseira
backWidth = 586
leftEdge = -586/2 = -293
rightEdge = 586/2 = 293

// Laterais (mesmas posições)
leftSide outer = -293
rightSide outer = 293

// Encaixe
leftGap = -293 - (-293) = 0mm ✅ (encostada)
rightGap = 293 - 293 = 0mm ✅ (encostada)
```

**Validação:**
- [ ] Traseira encostada nas laterais (sem gap)

---

## ✅ 4. VALIDAÇÕES DE MOVIMENTO

### 4.1 - Abertura Individual

**Teste:**
```typescript
// Criar 3 gavetas
const drawerGroup = generateDrawerGroup({ drawerCount: 3, ... });

// Abrir apenas a segunda
const updatedGroup = setDrawerOpenInGroup(drawerGroup, drawerGroup.drawers[1].id, true);
```

**Validações:**
- [ ] `updatedGroup.drawers[0].motion.isOpen === false` (primeira fechada)
- [ ] `updatedGroup.drawers[1].motion.isOpen === true` (segunda aberta)
- [ ] `updatedGroup.drawers[2].motion.isOpen === false` (terceira fechada)
- [ ] Apenas UMA gaveta é afetada

### 4.2 - Frente + Corpo Movem Juntos

**Teste:**
```typescript
const drawer = drawerGroup.drawers[0];
const openDrawer = setDrawerOpen(drawer, true);
```

**Validações:**
- [ ] `openDrawer.motion.currentOffset === drawer.specs.positioning.pullDistance`
- [ ] Offset aplica-se ao **grupo inteiro** (frente + corpo + laterais + fundo + traseira)
- [ ] Todas as peças movem-se pela mesma distância

### 4.3 - Animação Suave

**Teste:**
```typescript
const animation = createDrawerAnimation(drawer, true, 1500);
```

**Validações:**
- [ ] `animation.startProgress === 0` (fechada)
- [ ] `animation.targetProgress === 1` (abrir totalmente)
- [ ] `animation.duration === 1500` (1.5 segundos)
- [ ] `animation.easing` é uma função (easeInOutCubic)

---

## ✅ 5. VALIDAÇÕES DE BOM (Bill of Materials)

### 5.1 - Peças de Madeira

**Teste:**
```typescript
const pieces = extractDrawerPiecesForBom(drawer);
```

**Validações:**
- [ ] `pieces.length === 5` (frente + 2 laterais + fundo + traseira)
- [ ] Todas as peças têm `width > 0`
- [ ] Todas as peças têm `height > 0`
- [ ] Todas as peças têm `depth > 0`
- [ ] Todas as peças têm `areaM2 > 0`
- [ ] Todas as peças têm `volumeM3 > 0`

**Por tipo:**
- [ ] 1x `pieceType === 'front'`
- [ ] 1x `pieceType === 'leftSide'`
- [ ] 1x `pieceType === 'rightSide'`
- [ ] 1x `pieceType === 'bottom'`
- [ ] 1x `pieceType === 'back'`

### 5.2 - Ferragens

**Teste:**
```typescript
const hardware = extractDrawerHardwareForBom(drawer);
```

**Validações:**
- [ ] `hardware.length === 3` (corrediças + parafusos + puxador)
- [ ] 1x `hardwareType === 'slide'` com `quantity === 2`
- [ ] 1x `hardwareType === 'screw'` com `quantity === 8`
- [ ] 1x `hardwareType === 'handle'` com `quantity === 1`

### 5.3 - Grupo de Gavetas

**Teste:**
```typescript
const drawerGroup = generateDrawerGroup({ drawerCount: 3, ... });
const allPieces = extractDrawerGroupPiecesForBom(drawerGroup);
const allHardware = extractDrawerGroupHardwareForBom(drawerGroup);
```

**Validações:**
- [ ] `allPieces.length === 15` (5 peças x 3 gavetas)
- [ ] `allHardware.length === 9` (3 tipos x 3 gavetas)
- [ ] Cada peça tem `drawerIndex` diferente (1, 2, 3)
- [ ] Cada peça tem `drawerId` único

### 5.4 - Resumo

**Teste:**
```typescript
const summary = summarizeDrawerPieces(allPieces);
const hwSummary = summarizeDrawerHardware(allHardware);
```

**Validações:**
- [ ] `summary` agrupa por tipo de peça
- [ ] Cada tipo tem `totalQuantity` correto
- [ ] `totalAreaM2` é a soma de todas as áreas
- [ ] `hwSummary` agrupa por tipo de ferrage
- [ ] Corrediças: `totalQuantity === 6` (2 por gaveta x 3 gavetas)

---

## ✅ 6. VALIDAÇÕES DE INTEGRAÇÃO

### 6.1 - Adapter: Domínio → Layers

**Teste:**
```typescript
const layerItems = drawerGroupToLayerItems(drawerGroup);
```

**Validações:**
- [ ] `layerItems.length === drawerGroup.drawers.length`
- [ ] Cada item tem `width`, `height`, `depth` corretos
- [ ] Cada item tem `bodyWidth`, `bodyHeight`, `bodyDepth` corretos
- [ ] Cada item tem `isOpen` correspondente ao domínio
- [ ] Cada item tem `pullDistanceMm` correto

### 6.2 - Adapter: Layers → Domínio

**Teste:**
```typescript
const updated = updateDrawerGroupFromLayerItems(drawerGroup, layerItems);
```

**Validações:**
- [ ] `updated.drawers.length === drawerGroup.drawers.length`
- [ ] Estados de abertura sincronizados
- [ ] IDs preservados
- [ ] Posições atualizadas

### 6.3 - BoxBuilder (Renderização)

**Teste visual no viewer 3D:**
- [ ] Frente aparece na frente (não flutuando)
- [ ] Laterais visíveis
- [ ] Fundo visível embaixo
- [ ] Traseira visível no fundo
- [ ] Sem peças atravessando paredes do box
- [ ] Abrir gaveta: todas as peças movem juntas
- [ ] Fechar gaveta: todas as peças voltam juntas

---

## ✅ 7. VALIDAÇÕES DE CASOS ESPECIAIS

### 7.1 - Gaveta Tipo PRO

**Teste:**
```typescript
const proGroup = generateDrawerGroup({ drawerType: 'pro', ... });
const proDrawer = proGroup.drawers[0];
const proPieces = extractDrawerPiecesForBom(proDrawer);
```

**Validações:**
- [ ] `proDrawer.type === 'pro'`
- [ ] `proDrawer.sideMaterial === 'aluminum'`
- [ ] `proDrawer.specs.leftSide.width === 0` (sem laterais de madeira)
- [ ] `proDrawer.specs.rightSide.width === 0`
- [ ] `proDrawer.specs.bottom.thickness === 0` (sem fundo de madeira)
- [ ] `proPieces.length === 2` (apenas frente + traseira)
- [ ] Corrediças tipo PRO no hardware

### 7.2 - Distribuição de Alturas

**Teste:**
```typescript
// Modo 'equal'
const equalGroup = generateDrawerGroup({ heightMode: 'equal', drawerCount: 3, ... });

// Modo 'top_small_mid_medium_bottom_large'
const progressiveGroup = generateDrawerGroup({
  heightMode: 'top_small_mid_medium_bottom_large',
  drawerCount: 3,
  ...
});
```

**Validações:**
- [ ] **Equal:** Todas as gavetas têm a mesma altura
- [ ] **Progressive:** Gaveta de cima < meio < baixo
- [ ] Soma das alturas === altura do box
- [ ] Posições Y não se sobrepõem

### 7.3 - Box Pequeno

**Teste:**
```typescript
const smallBox = generateDrawerGroup({
  boxWidth: 300,
  boxHeight: 400,
  boxDepth: 250,
  drawerCount: 2,
  ...
});
```

**Validações:**
- [ ] `smallBox.drawers.length === 2` (gerou 2 gavetas)
- [ ] Dimensões válidas (> 0)
- [ ] Frente não ultrapassa limites
- [ ] Corpo não ultrapassa limites

### 7.4 - Box Sem Espaço para Gavetas

**Teste:**
```typescript
const tooSmall = canBoxHaveDrawers({
  boxWidth: 100,
  boxHeight: 50,
  boxDepth: 100,
});
```

**Validações:**
- [ ] `tooSmall === false` (altura insuficiente)
- [ ] `generateDrawerGroup()` retorna grupo vazio ou lança erro

---

## 🎯 RESULTADO ESPERADO

Após passar por **TODAS** as validações acima:

✅ Sistema de gavetas está funcionando **PERFEITAMENTE**  
✅ Regras de marcenaria **100% IMPLEMENTADAS**  
✅ Todas as peças aparecem na **BOM/PDF**  
✅ Geometria **REALISTA** e **MONTÁVEL**  
✅ Abertura **INDIVIDUAL** (bug eliminado)  
✅ Código **LIMPO** e **TESTÁVEL**

---

## 📋 Checklist Rápido (Resumo)

### Dimensões
- [ ] Frente = larguraInterna - 2mm
- [ ] Corpo = larguraInterna - 14mm
- [ ] Diferença = 12mm (exato)
- [ ] Fundo entra 5mm em todas as peças
- [ ] Traseira 10mm mais curta

### Geometria
- [ ] Frente colada ao corpo (não flutua)
- [ ] Todas as peças encostadas (sem gaps)
- [ ] Laterais tocam o fundo
- [ ] Traseira entre as laterais

### Movimento
- [ ] Abertura individual por ID
- [ ] Frente + corpo movem juntos
- [ ] Animação suave (1.5s)

### BOM
- [ ] 5 peças por gaveta (normal) ou 2 (PRO)
- [ ] Corrediças (2x)
- [ ] Parafusos (~8x)
- [ ] Puxador (1x)
- [ ] Área/volume calculados

### Visual (3D)
- [ ] Todas as peças visíveis
- [ ] Nenhuma peça atravessa paredes
- [ ] Movimento sincronizado
- [ ] Sem artefatos gráficos

---

**Use este checklist antes de dar o sistema como PRONTO!** 🚀
