# Viewer Engine — Etapa 1: Divisão Estrutural

Documentação da primeira etapa da refatoração modular do Viewer (Viewer Engine).

## Objetivo

Criar uma arquitetura modular clara para o Viewer, separando responsabilidades e preparando para futura plataforma baseada em Plugins + Micro-Services, **sem alterar API pública nem comportamento funcional**.

---

## 1. O que foi criado

### Estrutura de pastas

```
src/3d/viewer-engine/
├── camera/           # Câmera (CameraManager)
│   ├── CameraManager.ts
│   └── index.ts
├── controls/         # OrbitControls (Controls)
│   ├── Controls.ts
│   └── index.ts
├── lighting/         # Iluminação (Lights)
│   ├── Lights.ts
│   └── index.ts
├── events/           # Reservado (handlers de eventos)
│   └── index.ts
├── tools/            # Reservado (TransformControls, gizmos)
│   └── index.ts
├── state/            # Reservado (estado do viewer)
│   └── index.ts
├── utils/            # Reservado (helpers)
│   └── index.ts
├── ViewerCore.ts     # Implementação central do Viewer
└── index.ts          # Entrada do viewer-engine
```

---

## 2. O que foi movido e para onde

| Antes (src/3d/core/) | Depois (src/3d/viewer-engine/) |
|----------------------|---------------------------------|
| `CameraManager.ts`   | `camera/CameraManager.ts`       |
| `CameraOptions`      | `camera/index.ts`              |
| `Controls.ts`        | `controls/Controls.ts`         |
| `ControlsOptions`    | `controls/index.ts`            |
| `Lights.ts`          | `lighting/Lights.ts`           |
| `LightsOptions`      | `lighting/index.ts`            |
| Implementação da classe `Viewer` (corpo completo) | `ViewerCore.ts` (classe `ViewerCore`) |

Os ficheiros `CameraManager.ts`, `Controls.ts` e `Lights.ts` foram **removidos** de `src/3d/core/`; o único consumidor era o `Viewer`, que passa a usar os módulos do viewer-engine via `ViewerCore`.

---

## 3. O que permanece no Viewer.ts (core)

O ficheiro `src/3d/core/Viewer.ts` ficou reduzido a um **delegador**:

- Importa `ViewerCore` e o tipo `ViewerOptions` de `../viewer-engine/ViewerCore`.
- Exporta a classe `Viewer` como **extensão** de `ViewerCore` (`export class Viewer extends ViewerCore`).
- Re-exporta o tipo `ViewerOptions`.

Assim, a API pública mantém-se: quem importa `Viewer` ou `ViewerOptions` de `3d/core/Viewer` continua a usar os mesmos nomes e assinaturas, sem alterações.

---

## 4. ViewerCore.ts

- **Localização:** `src/3d/viewer-engine/ViewerCore.ts`
- **Responsabilidade:** Centralizar a inicialização e toda a lógica que antes estava no `Viewer.ts` (cena, câmera, controles, iluminação, boxes, sala, eventos, etc.).
- **Imports dos novos módulos:**
  - `./camera` → `CameraManager`, `CameraOptions`
  - `./controls` → `Controls`, `ControlsOptions`
  - `./lighting` → `Lights`, `LightsOptions`
- **Restantes dependências:** Continuam a ser importadas de `../core/`, `../objects/`, `../room/`, etc. (SceneManager, RendererManager, BoxBuilder, RoomManager, etc.).
- **Nome da classe:** `ViewerCore` (referências estáticas internas foram atualizadas de `Viewer.` para `ViewerCore.`).

TransformControls, OrbitControls, eventos de canvas e demais funcionalidades permanecem no `ViewerCore`; nenhuma funcionalidade foi removida.

---

## 5. O que será dividido na próxima etapa

- **events/:** Extrair registo e handlers de eventos (click, pointerdown, pointermove, etc.) do `ViewerCore` para um módulo que receba uma interface do viewer e registe os listeners.
- **tools/:** Extrair criação, anexação e lógica de TransformControls (e eventualmente outros gizmos) para um módulo de ferramentas.
- **state/:** Extrair estado de seleção, preset de câmera, modo de transformação, etc., para um módulo de estado (ou objeto de estado) consumido pelo ViewerCore.
- **utils/:** Extrair funções auxiliares (ex.: `getPointerNdc`, helpers de raycast, constantes partilhadas) para o módulo `utils/`.

Nesta etapa 1 **não** foram feitas otimizações nem remoção de duplicações; apenas a estrutura modular foi criada e a implementação foi concentrada no `ViewerCore` com camera/controls/lighting já em submódulos.

---

## 6. Compatibilidade e regras respeitadas

- **API pública:** `Viewer` e `ViewerOptions` continuam a ser exportados de `src/3d/core/Viewer.ts` com a mesma assinatura.
- **TCN, Rules, BoxBuilder, Layout Engine, Room Engine:** Nenhuma alteração; o ViewerCore importa e usa os mesmos módulos que o Viewer original.
- **Comportamento:** Idêntico; apenas a localização do código e os caminhos de import foram alterados.
- **Build:** `npm run build` conclui com sucesso após as alterações.
