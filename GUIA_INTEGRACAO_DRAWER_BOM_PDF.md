# Guia de Integração: DrawerBomService → PDF/BOM

Este documento explica como integrar o novo `DrawerBomService` no fluxo de geração de PDFs e listas de corte do PIMO-CRIATIVO.

---

## 🎯 Objetivo

Garantir que **TODAS** as peças de gavetas apareçam nos PDFs técnicos:
- Lista de corte (cutlist)
- PDF técnico completo
- Relatórios de materiais

---

## 📋 Uso Básico

### 1. Extrair Peças de um Box com Gavetas

```typescript
import {
  extractDrawerGroupPiecesForBom,
  extractDrawerGroupHardwareForBom,
} from '@/core/drawers';
import { drawerGroupToLayerItems } from '@/core/drawers/adapters/drawerGroupToLayerItems';

// Converter LayerItems de volta para DrawerGroup
function getDrawerGroupFromBox(box: WorkspaceBox): DrawerGroup | null {
  if (!box.drawersLayer || box.drawersLayer.length === 0) {
    return null;
  }
  
  // Aqui você precisa reconstruir o DrawerGroup a partir das LayerItems
  // Opção 1: Armazenar DrawerGroup no box
  // Opção 2: Regenerar DrawerGroup com regenerateLayersForBox
  
  // Por simplicidade, vamos assumir que existe:
  return box.drawerGroup;
}

// Extrair peças
const box = project.workspaceBoxes[0];
const drawerGroup = getDrawerGroupFromBox(box);

if (drawerGroup) {
  // Peças de madeira
  const pieces = extractDrawerGroupPiecesForBom(drawerGroup);
  
  // Ferragens
  const hardware = extractDrawerGroupHardwareForBom(drawerGroup);
  
  console.log(`Total peças: ${pieces.length}`);
  console.log(`Total ferragens: ${hardware.length}`);
}
```

### 2. Integrar no PDF de Corte

**Arquivo:** `src/core/pdf/pdfCutlist.ts`

```typescript
import {
  extractDrawerGroupPiecesForBom,
  type DrawerPieceForBom,
} from '@/core/drawers';

export function buildCutlistPdf(project: Project) {
  const doc = new jsPDF();
  
  // ... código existente para painéis, portas, etc.
  
  // ADICIONAR: Seção de gavetas
  project.boxes.forEach((box) => {
    const drawerGroup = getDrawerGroupFromBox(box);
    if (!drawerGroup) return;
    
    const drawerPieces = extractDrawerGroupPiecesForBom(drawerGroup);
    
    // Agrupar por tipo
    const byType = new Map<string, DrawerPieceForBom[]>();
    drawerPieces.forEach((piece) => {
      const key = piece.pieceType;
      if (!byType.has(key)) byType.set(key, []);
      byType.get(key)!.push(piece);
    });
    
    // Adicionar ao PDF
    doc.addPage();
    doc.setFontSize(16);
    doc.text(`GAVETAS - Box ${box.nome}`, 20, 20);
    
    let y = 40;
    byType.forEach((pieces, type) => {
      doc.setFontSize(12);
      doc.text(`${type.toUpperCase()}:`, 20, y);
      y += 10;
      
      pieces.forEach((piece, idx) => {
        doc.setFontSize(10);
        doc.text(
          `  ${idx + 1}. ${piece.pieceName} - ${piece.width}x${piece.height}x${piece.depth}mm`,
          20,
          y
        );
        y += 8;
      });
      
      y += 5;
    });
  });
  
  return doc;
}
```

### 3. Integrar no PDF Técnico

**Arquivo:** `src/core/pdf/pdfUnified.ts`

```typescript
import {
  extractDrawerGroupPiecesForBom,
  extractDrawerGroupHardwareForBom,
  summarizeDrawerPieces,
  summarizeDrawerHardware,
} from '@/core/drawers';

export function buildUnifiedPdf(project: Project) {
  const doc = new jsPDF();
  
  // ... código existente ...
  
  // ADICIONAR: Resumo de gavetas
  doc.addPage();
  doc.setFontSize(18);
  doc.text('RESUMO DE GAVETAS', 20, 20);
  
  let totalPieces: DrawerPieceForBom[] = [];
  let totalHardware: DrawerHardwareForBom[] = [];
  
  project.boxes.forEach((box) => {
    const drawerGroup = getDrawerGroupFromBox(box);
    if (!drawerGroup) return;
    
    totalPieces.push(...extractDrawerGroupPiecesForBom(drawerGroup));
    totalHardware.push(...extractDrawerGroupHardwareForBom(drawerGroup));
  });
  
  // Resumo de peças
  const pieceSummary = summarizeDrawerPieces(totalPieces);
  
  let y = 40;
  doc.setFontSize(14);
  doc.text('Peças de Madeira:', 20, y);
  y += 10;
  
  pieceSummary.forEach((item) => {
    doc.setFontSize(10);
    doc.text(
      `${item.pieceType}: ${item.totalQuantity}x (${item.totalAreaM2.toFixed(2)}m²)`,
      30,
      y
    );
    y += 8;
  });
  
  // Resumo de ferragens
  y += 10;
  const hardwareSummary = summarizeDrawerHardware(totalHardware);
  
  doc.setFontSize(14);
  doc.text('Ferragens:', 20, y);
  y += 10;
  
  hardwareSummary.forEach((item) => {
    doc.setFontSize(10);
    doc.text(
      `${item.hardwareName}: ${item.totalQuantity}x`,
      30,
      y
    );
    y += 8;
  });
  
  return doc;
}
```

### 4. Integrar no Cálculo de Materiais

**Arquivo:** `src/services/materialCalculationService.ts` (ou similar)

```typescript
import {
  extractDrawerGroupPiecesForBom,
  type DrawerPieceForBom,
} from '@/core/drawers';

export function calculateTotalMaterialsForProject(project: Project) {
  let totalAreaM2 = 0;
  let totalVolumeM3 = 0;
  
  // ... painéis, portas, prateleiras ...
  
  // ADICIONAR: Gavetas
  project.boxes.forEach((box) => {
    const drawerGroup = getDrawerGroupFromBox(box);
    if (!drawerGroup) return;
    
    const pieces = extractDrawerGroupPiecesForBom(drawerGroup);
    
    pieces.forEach((piece) => {
      totalAreaM2 += piece.areaM2;
      totalVolumeM3 += piece.volumeM3;
    });
  });
  
  return {
    totalAreaM2,
    totalVolumeM3,
    estimatedCost: totalAreaM2 * project.material.precoPorM2,
  };
}
```

---

## 🔧 Adaptações Necessárias

### 1. Armazenar DrawerGroup no WorkspaceBox

**Opção A: Adicionar campo ao WorkspaceBox**

```typescript
// src/core/types.ts
import type { DrawerGroup } from './drawers';

export interface WorkspaceBox {
  // ... campos existentes ...
  
  // ADICIONAR:
  drawerGroup?: DrawerGroup;  // Domínio puro
  drawersLayer?: DrawerLayerItem[];  // Conversão para layers (legacy)
}
```

**Opção B: Regenerar DrawerGroup dinamicamente**

```typescript
import { generateDrawerGroup } from '@/core/drawers';

function getDrawerGroupFromBox(box: WorkspaceBox): DrawerGroup | null {
  if (box.gavetas === 0) return null;
  
  // Regenerar a partir dos dados do box
  return generateDrawerGroup({
    boxWidth: box.dimensoes.largura,
    boxHeight: box.dimensoes.altura,
    boxDepth: box.dimensoes.profundidade,
    boxThickness: box.espessura,
    boxId: box.id,
    drawerCount: box.gavetas,
    drawerType: box.drawerType ?? 'normal',
    heightMode: box.drawerHeightMode ?? 'equal',
    availableDepths: [250, 300, 350, 400, 450, 500, 550, 600],
  });
}
```

### 2. Sincronizar DrawerGroup com DrawerLayerItem

**Quando o usuário edita uma gaveta:**

```typescript
// ProjectProvider.tsx - updateDrawerLayerItem
updateDrawerLayerItem: (id, partial) => {
  updateProject((prev) => {
    const box = getSelectedBox(prev);
    if (!box) return prev;
    
    // Atualizar LayerItem
    const updatedLayers = box.drawersLayer.map((item) =>
      item.id === id ? { ...item, ...partial } : item
    );
    
    // ADICIONAR: Atualizar DrawerGroup também
    const updatedGroup = box.drawerGroup
      ? updateDrawerGroupFromLayerItems(box.drawerGroup, updatedLayers)
      : undefined;
    
    const workspaceBoxes = prev.workspaceBoxes.map((b) =>
      b.id === box.id
        ? { ...b, drawersLayer: updatedLayers, drawerGroup: updatedGroup }
        : b
    );
    
    return { ...prev, workspaceBoxes };
  });
},
```

---

## 📊 Exemplo de Saída BOM

### Para um Box com 3 Gavetas (600x800x450mm)

**Peças de Madeira:**
```
ID: drawer-1-front
  Tipo: Frente da Gaveta
  Dimensões: 598 x 248 x 19 mm
  Área: 0.148 m²
  Volume: 0.0028 m³
  Material: MDF Branco 19mm
  Quantidade: 1

ID: drawer-1-leftSide
  Tipo: Lateral Esquerda
  Dimensões: 15 x 250 x 400 mm
  Área: 0.100 m²
  Volume: 0.0015 m³
  Material: MDF Branco 15mm
  Quantidade: 1

... (15 peças no total)
```

**Ferragens:**
```
Corrediças Telescópicas Normal (400mm): 6x
Parafusos 4x30mm: 24x
Puxadores: 3x
```

**Resumo:**
```
Total peças madeira: 15
Total área: 1.85 m²
Total volume: 0.042 m³
Custo estimado: R$ 46.25 (MDF @ R$25/m²)
Total ferragens: 33 unidades
```

---

## ✅ Checklist de Integração

- [ ] Adicionar campo `drawerGroup?: DrawerGroup` ao `WorkspaceBox`
- [ ] Sincronizar `drawerGroup` quando `drawersLayer` for atualizado
- [ ] Integrar `extractDrawerGroupPiecesForBom` no `buildCutlistPdf`
- [ ] Integrar `extractDrawerGroupHardwareForBom` no `buildUnifiedPdf`
- [ ] Adicionar seção "Gavetas" no PDF técnico
- [ ] Incluir peças de gavetas no cálculo de materiais
- [ ] Testar com múltiplos boxes
- [ ] Validar dimensões exportadas
- [ ] Verificar área/volume calculados
- [ ] Testar com gavetas tipo PRO (sem laterais de madeira)

---

## 🎯 Resultado Esperado

Depois da integração, ao exportar PDF:
1. ✅ Todas as **5 peças** de cada gaveta aparecem na lista
2. ✅ **Corrediças** (2x por gaveta) listadas nas ferragens
3. ✅ **Parafusos** e **puxadores** contabilizados
4. ✅ **Área total** de material corretamente calculada
5. ✅ **Custo estimado** inclui gavetas
6. ✅ **Cada gaveta** identificada por índice (Gaveta 1, Gaveta 2, etc.)

---

## 📚 Referências

- **DrawerBomService.ts** - Funções de extração
- **drawerGroupToLayerItems.ts** - Conversão bidirecional
- **RELATORIO_CORRECAO_COMPLETA_GAVETAS_MARCENARIA.md** - Regras implementadas
- **README.md** (drawers domain) - Documentação completa

---

**Próximo passo:** Escolher Opção A ou B para armazenar DrawerGroup e implementar integração no PDF.
