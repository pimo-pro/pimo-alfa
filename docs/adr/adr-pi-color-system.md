# ADR — Sistema de cor Pi (escalas de 7 tons)

- **Status:** Aceite (decisão de representação; aplicação diferida)
- **Data:** 2026-07-19
- **Branch:** `theme/pi-hardening`
- **Contexto:** Passo 5 do plano de endurecimento do tema Pi
- **Fonte oficial versionada:** [`src/theme/palettes/reference/chalk_iron_sienna_full_system.html`](../../src/theme/palettes/reference/chalk_iron_sienna_full_system.html)

## Contexto

O template Pi hoje funciona como **remap** de ~103 tokens Alpha (`piPalette.ts` + `--pi-btn-*`), sem namespace `--ci-*` e sem as escalas completas de 7 tons (Prussian / Sienna) do HTML oficial.

O HTML `chalk_iron_sienna_full_system.html` define:

- Base: `--ci-chalk`, `--ci-chalk-dim`, `--ci-iron`, `--ci-iron-deep`
- Accents: `--ci-prussian` (+ lt/dk), `--ci-sienna` (+ lt/dk)
- Semánticos: `--ci-success`, `--ci-danger`
- Superfícies light/dark
- Escalas visuais 50—900 (Prussian e Sienna) no documento de referéncia

**Este ADR não aplica escalas ao CSS runtime.** Apenas define como o projeto as representará quando forem introduzidas.

## Opções

### Opção A — Só CSS vars (`--ci-prussian-50` — `--ci-prussian-900`)

Definir variáveis CSS (ex. sob `[data-theme-template="pi"]`) e consumir diretamente no CSS.

| Prós | Contras |
|------|---------|
| Familiar para designers/CSS | Duplica fonte se `piPalette` continuar a remapear Alpha |
| útil no preload / DevTools | Alpha não deve herdar; exige gates rigorosos |
| Escalas disponíveis sem JS | Editor Fase 6 teria de editar CSS ou gerar CSS |

### Opção B — Só tokens JS (`piPalette.ts` / módulo `ciScales.ts`)

Manter SSOT em TypeScript; consumidores leem constantes JS ou o Context injeta só o que precisa.

| Prós | Contras |
|------|---------|
| Alinhado ao remap atual | CSS puro não vá escalas sem injeção |
| Fácil de testar / versionar | Preload precisaria de subset gerado ou hardcode |
| Fase 6 edita JSON/TS com validação | Menos —design tokens CSSó nativos |

### Opção C — Ambos, com prioridade definida (recomendada)

1. **SSOT das escalas e do namespace `--ci-*`:** módulo JS derivado do HTML oficial (ex. `ciScales.ts` / `ciTokens.ts`), gerado ou mantido — mão a partir da referéncia versionada.
2. **Runtime Pi (curto prazo):** continua o **remap Alpha** (`piPalette.ts`) — sem mudar visual até um passo explícito.
3. **Exposição CSS (médio prazo):** quando houver consumidores, injetar `--ci-*` e `--ci-prussian-50` — só com `[data-theme-template="pi"]` (e opcionalmente no preload Pi, subset).
4. **Prioridade em conflito:** valor JS SSOT > CSS injetado pelo provider > qualquer hardcode. O remap Alpha não redefine as escalas `--ci-*`; apenas mapeia tokens Alpha existentes.

## Impactos

### Alpha

- **Sem impacto** se `--ci-*` e escalas forem gated a `data-theme-template="pi"`.
- `index.css` Alpha permanece SSOT do template default.
- Proibido: definir `--ci-*` em `:root` global sem gate.

### Pi

- Visual atual (remap) **inalterado** por este ADR.
- Futuro: escalas permitem hover/focus/sienna CTA sem —inventar… hex fora do HTML oficial.
- Botões (`--pi-btn-*`) permanecem camada própria; podem referenciar `--ci-prussian` / `--ci-danger` numa migração posterior, sem obrigação imediata.

### Preload (Passo 1)

- Mantém **subset mínimo** anti-FOUC (já alinhado aos hex do HTML).
- Quando as escalas existirem no SSOT JS, o preload **não** precisa das 7 tons completas — só superfícies/texto/primário.
- Qualquer expansão do preload deve continuar gated a `html[data-theme-template="pi"]`.

### Editor futuro (Fase 6)

- Editor edita overrides do **remap Alpha** (`pimo-pi-token-overrides`) primeiro.
- Escalas `--ci-*` / 50—900: começar como **catálogo só de leitura** (picker), depois overrides opcionais por modo.
- Não misturar no mesmo formulário —token Alpha remapeado… e —degrau de escala… sem labels claros.

### Industrial / botões (Passos 2—3)

- **Fora de âmbito deste ADR.** Nenhuma alteração a estilos industriais nem ao sistema de botões neste passo.
- Migração futura de industriais para `--ci-*` seria passo explícito separado.

## Recomendação final

**Adotar a Opção C.**

1. Versionar o HTML oficial em `src/theme/palettes/reference/` (feito neste passo).
2. Próximos passos de implementação (não neste Passo 5):
   - Extrair constantes JS `CI_BASE` + `PRUSSIAN_SCALE` + `SIENNA_SCALE` a partir do HTML.
   - Manter `piPalette.ts` como remap até haver consumidores das escalas.
   - Só então expor CSS vars `--ci-*` gated ao template Pi.
3. **Não aplicar escalas agora** — zero mudança visual Alpha/Pi.

## Consequéncias

- Fonte oficial auditável no repo (SHA do ficheiro de referéncia).
- Decisão clara para evitar um segundo SSOT acidental (hex espalhados no CSS).
- Caminho seguro: Alpha intacto; Pi endurecido incrementalmente.

## Referéncias

- Commit base do tema: `f8e577d`
- `src/theme/palettes/piPalette.ts`
- `src/theme/palettes/piButtonSystem.ts`
- `public/theme-preload.css` (subset Pi anti-FOUC)
- Plano: Passos 1—4 do branch `theme/pi-hardening`
