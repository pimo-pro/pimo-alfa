# Relatório: Implementação de Furos Superiores (Top Drilling) no PIMO-CRIATIVO
**Data:** 26 de fevereiro de 2026  
**Status:** ✅ FASE 1 CONCLUÍDA

## Resumo Executivo

Implementado suporte completo para furação superior (top drilling) no sistema PIMO-CRIATIVO, com foco inicial em **furos de prateleira (Shelf Holes)**. Os furos são gerados no ficheiro `.tcn` usando operações W#81 padrão ALBATROS/EDICAD e visualizados no Layout de Corte PRO com cores diferenciadas.

## Objetivos Cumpridos

### ✅ 1. Operações W#81 para Furação Superior
Implementado gerador de operações W#81 com formato correto:
```
W#81{ ::WTs WS=1 #8015=0 #1=<X> #2=<Y> #3=<Z> #1002=<DIAMETRO> #2008=<FEED> #2002=<RPM> #201=1 #203=1 #1001=0 }W
```

**Parâmetros:**
- `#1`: coordenada X (mm)
- `#2`: coordenada Y (mm)
- `#3`: profundidade Z (negativo, ex: -13 para 13mm)
- `#1002`: diâmetro da broca (mm, padrão: 5mm)
- `#2008`: feed rate (mm/min, padrão: 1000)
- `#2002`: rotação (RPM, padrão: 18000)

### ✅ 2. Configuração de Furos de Prateleira
Adicionado novo tipo de furo `shelfTop` em [rulesConfig.ts](src/core/rules/rulesConfig.ts):

```typescript
shelfTop: {
  enabled: true,
  distanciaFrente: 37,    // mm da borda frontal
  distanciaFundo: 37,     // mm da borda traseira
  distanciaEsquerda: 37,  // mm da borda esquerda
  distanciaDireita: 37,   // mm da borda direita
  diametro: 5,            // mm
  profundidade: 13,       // mm
}
```

### ✅ 3. Integração no Fluxo de Dados
Os furos são integrados no fluxo completo:
```
Peça (prateleira)
  ↓
calcShelfTopHoles() — gera 4 furos nos cantos
  ↓
pl.holes[] — array de furos por peça
  ↓
buildDrillLines() — gera linhas W#81
  ↓
SIDE#1 no .tcn — furos antes dos cortes
  ↓
Ficheiro .tcn completo
```

### ✅ 4. Visualização no Layout de Corte PRO
- **Furos de prateleira:** 🟢 Círculos verdes preenchidos
- **Furos gerais:** 🔴 Círculos vermelhos preenchidos
- Legenda adicionada na parte inferior do PDF
- Escala respeitada (raio proporcional ao diâmetro real)

## Arquivos Modificados

### 1. **Gerador TCN** — [src/core/cnc/tcnGenerator.ts](src/core/cnc/tcnGenerator.ts)

#### Adicionado: `buildW81Drill()`
```typescript
function buildW81Drill(x: number, y: number, zDepth: number, diameter: number): string {
  const feedRate = 1000;
  const rpm = 18000;
  return `W#81{ ::WTs WS=1 #8015=0 #1=${fmt(x)} #2=${fmt(y)} #3=${fmtZ(zDepth)} #1002=${fmt(diameter)} #2008=${feedRate} #2002=${rpm} #201=1 #203=1 #1001=0 }W`;
}
```

#### Atualizado: `buildDrillLines()`
- Gera operações W#81 reais em vez de comentários simples
- Filtra apenas furos verticais (top drilling)
- Profundidade negativa (ex: -13 para 13mm)

#### Reorganizado: `generateTcnForPanel()`
- **Antes:** Cortes → Furos
- **Agora:** Furos → Cortes (ordem correta CNC)

**Estrutura do bloco SIDE#1:**
```
SIDE#1{
  $=top
  ::LF=2800 HF=2070 SF=19
  ::NSEQ=1
  
  <!-- FUROS PRIMEIRO -->
  W#81{ ... } <!-- Furo 1 -->
  W#81{ ... } <!-- Furo 2 -->
  W#81{ ... } <!-- Furo 3 -->
  W#81{ ... } <!-- Furo 4 -->
  
  <!-- CORTES DEPOIS -->
  W#81{ ... } <!-- Contorno peça 1 -->
  W#89{ ... }
  W#2201{ ... }
  ...
}SIDE
```

### 2. **Configuração de Regras** — [src/core/rules/rulesConfig.ts](src/core/rules/rulesConfig.ts)

#### Adicionado: Tipo `shelfTop`
```typescript
shelfTop: {
  enabled: boolean;
  distanciaFrente: number;
  distanciaFundo: number;
  distanciaEsquerda: number;
  distanciaDireita: number;
  diametro: number;
  profundidade: number;
}
```

#### Adicionado: Defaults
```typescript
shelfTop: {
  enabled: true,
  distanciaFrente: 37,
  distanciaFundo: 37,
  distanciaEsquerda: 37,
  distanciaDireita: 37,
  diametro: 5,
  profundidade: 13,
}
```

#### Atualizado: `normalizeRulesConfig()`
Inclui normalização para `shelfTop` garantindo compatibilidade com versões antigas.

### 3. **Serviço de Furação** — [src/core/drilling/drillingService.ts](src/core/drilling/drillingService.ts)

#### Adicionado: `calcShelfTopHoles()`
```typescript
function calcShelfTopHoles(piece: PieceInput, rules: RulesConfig, out: TechnicalDrillHole[]) {
  if (!rules?.furos?.tecnicos?.shelfTop) return;
  const cfg = rules.furos.tecnicos.shelfTop;
  if (!cfg.enabled) return;
  if (piece.tipo !== "prateleira") return;
  
  const face: DrillFace = "cima"; // Furação superior
  const xLeft = cfg.distanciaEsquerda;
  const xRight = piece.largura - cfg.distanciaDireita;
  const yFront = cfg.distanciaFrente;
  const yBack = piece.altura - cfg.distanciaFundo;
  
  // 4 furos nos cantos da prateleira
  pushHole(out, piece, xLeft, yFront, cfg.diametro, cfg.profundidade, "prateleira", face);
  pushHole(out, piece, xRight, yFront, cfg.diametro, cfg.profundidade, "prateleira", face);
  pushHole(out, piece, xLeft, yBack, cfg.diametro, cfg.profundidade, "prateleira", face);
  pushHole(out, piece, xRight, yBack, cfg.diametro, cfg.profundidade, "prateleira", face);
}
```

#### Atualizado: `calculateTechnicalDrillingsForPiece()`
Agora chama `calcShelfTopHoles()` para peças tipo "prateleira".

### 4. **PDF Layout de Corte** — [src/core/cutlayout/cutLayoutPdf.ts](src/core/cutlayout/cutLayoutPdf.ts)

#### Atualizado: Renderização de furos
- **Verde (34, 197, 94):** Furos de prateleira
- **Vermelho (220, 38, 38):** Outros furos
- Furos preenchidos (`circle(..., "FD")`)
- Legenda: "🔴 Furos gerais | 🟢 Furos de prateleira (top drilling)"

## Fluxo de Dados Completo

```
┌─────────────────────────┐
│ Box (móvel)             │
│ - prateleiras           │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ cutlistFromBoxes        │
│ - tipo: "prateleira"    │
│ - largura, altura       │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ drillingService         │
│ calcShelfTopHoles()     │
│ - 4 furos por prateleira│
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ CutPiece                │
│ holes: [...]            │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ cutLayoutEngine         │
│ runCutLayout()          │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ SheetResult             │
│ placements[].holes      │
└────────────┬────────────┘
             │
             ├──────────────────────┐
             │                      │
             ▼                      ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ tcnGenerator            │  │ cutLayoutPdf            │
│ - buildW81Drill()       │  │ - renderização verde    │
│ - buildDrillLines()     │  │ - círculos + legenda    │
└────────────┬────────────┘  └─────────────────────────┘
             │
             ▼
┌─────────────────────────┐
│ Ficheiro .tcn           │
│ SIDE#1{ ...W#81...}SIDE │
└─────────────────────────┘
```

## Como Testar

### 1. **Criar Projeto com Prateleiras**
- Abrir PIMO-CRIATIVO
- Criar novo projeto ou carregar existente
- Adicionar móvel com prateleiras (ex: estante, armário)

### 2. **Gerar Cutlist**
- Ir para cutlist/marcenaria
- Verificar peças tipo "prateleira"
- Confirmar que `furacoesTecnicas` contém 4 furos

### 3. **Visualizar no Layout de Corte PRO**
- Clicar em "Layout de Corte PRO"
- Verificar PDF gerado
- Confirmar:
  - ✅ Peças de prateleira têm **círculos verdes** nos cantos
  - ✅ Legenda aparece na parte inferior
  - ✅ Escala está correta

### 4. **Exportar Ficheiro TCN**
- Clicar em "Exportar CNC"
- Abrir ficheiro `.tcn` em editor de texto
- Verificar estrutura:

```tcn
TPA\ALBATROS\EDICAD\00.00:0
$=Acam Name=Projeto
::UNm DL=2800 DH=2070 DS=19 OX=0 OY=0 OZ=0
VAR{
}VAR
OPTI{
}OPTI
}SIDE
SIDE#1{
$=top
::LF=2800 HF=2070 SF=19
::NSEQ=1
W#81{ ::WTs WS=1 #8015=0 #1=100.00 #2=50.00 #3=-13 #1002=5.00 #2008=1000 #2002=18000 #201=1 #203=1 #1001=0 }W
W#81{ ::WTs WS=1 #8015=0 #1=700.00 #2=50.00 #3=-13 #1002=5.00 #2008=1000 #2002=18000 #201=1 #203=1 #1001=0 }W
W#81{ ::WTs WS=1 #8015=0 #1=100.00 #2=450.00 #3=-13 #1002=5.00 #2008=1000 #2002=18000 #201=1 #203=1 #1001=0 }W
W#81{ ::WTs WS=1 #8015=0 #1=700.00 #2=450.00 #3=-13 #1002=5.00 #2008=1000 #2002=18000 #201=1 #203=1 #1001=0 }W
<!-- ... cortes das peças -->
}SIDE
```

### 5. **Verificar Parâmetros**
- **#3 (profundidade):** Valor negativo (ex: -13)
- **#1002 (diâmetro):** 5.00 mm
- **#2008 (feed):** 1000 mm/min
- **#2002 (RPM):** 18000

### 6. **Testar em Máquina CNC** (Opcional)
- Carregar ficheiro `.tcn` na máquina ALBATROS
- Verificar simulação
- Confirmar:
  - ✅ Furos executados antes dos cortes
  - ✅ Profundidade correta (-13mm)
  - ✅ Diâmetro correto (5mm)
  - ✅ Sem erros de sintaxe

## Configurações Ajustáveis

### Via Admin Panel (Futuro)
Os seguintes parâmetros podem ser ajustados pelo usuário:

```typescript
// Admin → Regras → Furos Técnicos → Prateleira (Top)
shelfTop: {
  enabled: true/false,           // Ativar/desativar
  distanciaFrente: 37,           // mm (ajustar)
  distanciaFundo: 37,            // mm (ajustar)
  distanciaEsquerda: 37,         // mm (ajustar)
  distanciaDireita: 37,          // mm (ajustar)
  diametro: 5,                   // mm (ajustar)
  profundidade: 13,              // mm (ajustar)
}
```

### Parâmetros Fixos (Código)
```typescript
// tcnGenerator.ts
const feedRate = 1000;     // mm/min
const rpm = 18000;         // RPM
```

Para alterar feed/RPM, editar [src/core/cnc/tcnGenerator.ts](src/core/cnc/tcnGenerator.ts#L69-L70).

## Limitações Atuais

### ✅ Implementado
- ✅ Furação superior (top drilling)
- ✅ 4 furos por prateleira (cantos)
- ✅ Operações W#81 no `.tcn`
- ✅ Visualização verde no PDF
- ✅ Integração completa no fluxo

### ❌ Não Implementado (Fora do Escopo Fase 1)
- ❌ Furação lateral (horizontal drilling)
- ❌ Milling (fresagem)
- ❌ Ficheiros de drill separados
- ❌ Operações multi-face (SIDE#2-6)
- ❌ Furação em outras peças (portas, gavetas)

## Próximas Fases

### Fase 2: Expansão de Tipos de Furos
- [ ] Furos em portas (dobradiças)
- [ ] Furos em gavetas (corrediças)
- [ ] Furos em laterais (cavilhas)
- [ ] Configuração por peça individual

### Fase 3: Furação Lateral
- [ ] Operações W#81 em SIDE#3-6
- [ ] Coordenadas transformadas por face
- [ ] Visualização 3D de furos laterais

### Fase 4: Otimizações
- [ ] Detecção de furos duplicados
- [ ] Agrupamento por ferramenta
- [ ] Tool change automation
- [ ] Feed/RPM por material

### Fase 5: Interface Admin
- [ ] Painel de configuração visual
- [ ] Preview de furos em tempo real
- [ ] Templates de furação por tipo de móvel
- [ ] Importação/exportação de configurações

## Compatibilidade

### ✅ Máquinas Suportadas
- ALBATROS
- EDICAD
- Outras CNC com suporte a formato W#81

### ✅ Versões Anteriores
- Projetos antigos continuam funcionando
- Furos são adicionados automaticamente se `shelfTop.enabled = true`
- Configurações antigas são normalizadas com defaults

### ✅ Formatos de Exportação
- `.tcn` — Com furos W#81
- `.kdt` — Sem alterações (drilling não incluído)
- PDF Layout — Com visualização de furos

## Validação Técnica

### ✅ Testes Realizados
- ✅ Compilação sem erros
- ✅ Tipos TypeScript corretos
- ✅ Estrutura TCN válida
- ✅ Visualização PDF funcional
- ✅ Integração com cutlist

### ⏳ Testes Pendentes (Requerem Dados Reais)
- ⏳ Teste em máquina CNC real
- ⏳ Validação com operador de fábrica
- ⏳ Teste com diferentes tamanhos de prateleira
- ⏳ Teste com múltiplas prateleiras por projeto

## Troubleshooting

### Problema: Furos não aparecem no PDF
**Solução:**
1. Verificar `rulesConfig.shelfTop.enabled = true`
2. Confirmar peça tipo "prateleira" na cutlist
3. Verificar dimensões da peça (mínimo 100×100mm)

### Problema: Furos fora dos limites
**Solução:**
1. Ajustar `distanciaFrente/Fundo/Esquerda/Direita`
2. Garantir: `distancia < (dimensão/2)`
3. Verificar função `clamp()` em [drillingService.ts](src/core/drilling/drillingService.ts#L24)

### Problema: Ficheiro TCN inválido
**Solução:**
1. Verificar formato W#81 exato
2. Confirmar profundidade negativa (#3=-13)
3. Validar separadores (espaços, não tabs)

### Problema: Furos com coordenadas erradas
**Solução:**
1. Confirmar `pl.x_mm + hole.x` em [tcnGenerator.ts](src/core/cnc/tcnGenerator.ts#L183)
2. Verificar orientação da peça (rotação 0/90)
3. Testar com peça não rotacionada primeiro

## Conclusão

✅ **Fase 1 de furação superior (top drilling) totalmente implementada**  
✅ **Furos de prateleira funcionais no `.tcn` e Layout de Corte PRO**  
✅ **Sistema preparado para expansão (Fases 2-5)**  
✅ **Sem erros de compilação**  
✅ **Documentação completa**  

O sistema está pronto para teste com dados reais e validação em máquina CNC. A estrutura implementada permite fácil expansão para outros tipos de furos e faces.

---

**Implementado por:** GitHub Copilot  
**Modelo:** Claude Sonnet 4.5  
**Validação:** Sem erros de compilação  
**Arquivos modificados:** 4 (tcnGenerator.ts, rulesConfig.ts, drillingService.ts, cutLayoutPdf.ts)  
