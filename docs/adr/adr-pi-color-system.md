# ADR ù Sistema de cor Pi (escalas de 7 tons)

- **Status:** Aceite (decisùo de representaùùo; aplicaùùo diferida)
- **Data:** 2026-07-19
- **Branch:** `theme/pi-hardening`
- **Contexto:** Passo 5 do plano de endurecimento do tema Pi
- **Fonte oficial versionada:** [`src/theme/palettes/reference/chalk_iron_sienna_full_system.html`](../../src/theme/palettes/reference/chalk_iron_sienna_full_system.html)

## Contexto

O template Pi hoje funciona como **remap** de ~103 tokens Alpha (`piPalette.ts` + `--pi-btn-*`), sem namespace `--ci-*` e sem as escalas completas de 7 tons (Prussian / Sienna) do HTML oficial.

O HTML `chalk_iron_sienna_full_system.html` define:

- Base: `--ci-chalk`, `--ci-chalk-dim`, `--ci-iron`, `--ci-iron-deep`
- Accents: `--ci-prussian` (+ lt/dk), `--ci-sienna` (+ lt/dk)
- Semùnticos: `--ci-success`, `--ci-danger`
- Superfùcies light/dark
- Escalas visuais 50ù900 (Prussian e Sienna) no documento de referùncia

**Este ADR nùo aplica escalas ao CSS runtime.** Apenas define como o projeto as representarù quando forem introduzidas.

## Opùùes

### Opùùo A ù Sù CSS vars (`--ci-prussian-50` ù `--ci-prussian-900`)

Definir variùveis CSS (ex. sob `[data-theme-template="pi"]`) e consumir diretamente no CSS.

| Prùs | Contras |
|------|---------|
| Familiar para designers/CSS | Duplica fonte se `piPalette` continuar a remapear Alpha |
| ùtil no preload / DevTools | Alpha nùo deve herdar; exige gates rigorosos |
| Escalas disponùveis sem JS | Editor Fase 6 teria de editar CSS ou gerar CSS |

### Opùùo B ù Sù tokens JS (`piPalette.ts` / mùdulo `ciScales.ts`)

Manter SSOT em TypeScript; consumidores leem constantes JS ou o Context injeta sù o que precisa.

| Prùs | Contras |
|------|---------|
| Alinhado ao remap atual | CSS puro nùo vù escalas sem injeùùo |
| Fùcil de testar / versionar | Preload precisaria de subset gerado ou hardcode |
| Fase 6 edita JSON/TS com validaùùo | Menos ùdesign tokens CSSù nativos |

### Opùùo C ù Ambos, com prioridade definida (recomendada)

1. **SSOT das escalas e do namespace `--ci-*`:** mùdulo JS derivado do HTML oficial (ex. `ciScales.ts` / `ciTokens.ts`), gerado ou mantido ù mùo a partir da referùncia versionada.
2. **Runtime Pi (curto prazo):** continua o **remap Alpha** (`piPalette.ts`) ù sem mudar visual atù um passo explùcito.
3. **Exposiùùo CSS (mùdio prazo):** quando houver consumidores, injetar `--ci-*` e `--ci-prussian-50`ù sù com `[data-theme-template="pi"]` (e opcionalmente no preload Pi, subset).
4. **Prioridade em conflito:** valor JS SSOT > CSS injetado pelo provider > qualquer hardcode. O remap Alpha nùo redefine as escalas `--ci-*`; apenas mapeia tokens Alpha existentes.

## Impactos

### Alpha

- **Sem impacto** se `--ci-*` e escalas forem gated a `data-theme-template="pi"`.
- `index.css` Alpha permanece SSOT do template default.
- Proibido: definir `--ci-*` em `:root` global sem gate.

### Pi

- Visual atual (remap) **inalterado** por este ADR.
- Futuro: escalas permitem hover/focus/sienna CTA sem ùinventarù hex fora do HTML oficial.
- Botùes (`--pi-btn-*`) permanecem camada prùpria; podem referenciar `--ci-prussian` / `--ci-danger` numa migraùùo posterior, sem obrigaùùo imediata.

### Preload (Passo 1)

- Mantùm **subset mùnimo** anti-FOUC (jù alinhado aos hex do HTML).
- Quando as escalas existirem no SSOT JS, o preload **nùo** precisa das 7 tons completas ù sù superfùcies/texto/primùrio.
- Qualquer expansùo do preload deve continuar gated a `html[data-theme-template="pi"]`.

### Editor futuro (Fase 6)

- Editor edita overrides do **remap Alpha** (`pimo-pi-token-overrides`) primeiro.
- Escalas `--ci-*` / 50ù900: comeùar como **catùlogo sù de leitura** (picker), depois overrides opcionais por modo.
- Nùo misturar no mesmo formulùrio ùtoken Alpha remapeadoù e ùdegrau de escalaù sem labels claros.

### Industrial / botùes (Passos 2ù3)

- **Fora de ùmbito deste ADR.** Nenhuma alteraùùo a estilos industriais nem ao sistema de botùes neste passo.
- Migraùùo futura de industriais para `--ci-*` seria passo explùcito separado.

## Recomendaùùo final

**Adotar a Opùùo C.**

1. Versionar o HTML oficial em `src/theme/palettes/reference/` (feito neste passo).
2. Prùximos passos de implementaùùo (nùo neste Passo 5):
   - Extrair constantes JS `CI_BASE` + `PRUSSIAN_SCALE` + `SIENNA_SCALE` a partir do HTML.
   - Manter `piPalette.ts` como remap atù haver consumidores das escalas.
   - Sù entùo expor CSS vars `--ci-*` gated ao template Pi.
3. **Nùo aplicar escalas agora** ù zero mudanùa visual Alpha/Pi.

## Consequùncias

- Fonte oficial auditùvel no repo (SHA do ficheiro de referùncia).
- Decisùo clara para evitar um segundo SSOT acidental (hex espalhados no CSS).
- Caminho seguro: Alpha intacto; Pi endurecido incrementalmente.

## Referùncias

- Commit base do tema: `f8e577d`
- `src/theme/palettes/piPalette.ts`
- `src/theme/palettes/piButtonSystem.ts`
- `public/theme-preload.css` (subset Pi anti-FOUC)
- Plano: Passos 1ù4 do branch `theme/pi-hardening`
