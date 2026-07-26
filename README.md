# PIMO v3 � Deploy Frontend (Hostinger) + Backend (Render)

Este reposit�rio cont�m:

- **Frontend** (Vite/React) na raiz
- **Backend Node.js** em `backend/` (Express) para `/api/projects` e `/api/materials`

## Publicar o backend no Render

### Op�o A) Blueprint com `render.yaml`

O ficheiro `backend/render.yaml` j�est�preparado com:

- `rootDir: backend`
- `buildCommand: npm install && npm run build`
- `startCommand: npm run start`
- env vars: `PORT`, `PIMO_PROJECTS_DATA_DIR`

No Render:

- Crie um **New → Blueprint**
- Selecione este reposit�rio
- Confirme que o servi�o chama **`pimo-backend`**

### Vari�veis de ambiente (Render)

- **`PORT`**: o Render injeta automaticamente; pode deixar como est�.
- **`PIMO_PROJECTS_DATA_DIR`**: diret�rio para gravar os projetos em JSON.
  - No Render, use um caminho persistente (ex.: `/var/data/pimo/projects`) e conecte um **Disk** ao servi�o.

## Configurar o frontend para usar o backend do Render

O frontend l� a vari�vel `VITE_API_URL` para chamar a API:

- projetos: `VITE_API_URL + /api/projects/index.php`
- materiais: `VITE_API_URL + /api/materials`

### Em produ�o (Hostinger)

No build do frontend, defina:

- **`VITE_API_URL=https://pimo-backend.onrender.com`**

No reposit�rio, existe um `.env` para desenvolvimento e um `.env.example` como refer�ncia.

## Testar o fluxo completo

1. **Backend**: abra `GET /health` no servi�o do Render para confirmar que est�online.
2. **Frontend**: abra o site em `pimo.pro`.
3. DevTools → Network:
   - Abrir modal de materiais → deve fazer `GET {VITE_API_URL}/api/materials`
   - Clicar **�Gerar e Salvar Design”** → deve fazer `POST {VITE_API_URL}/api/projects/index.php`
4. Testar tamb�m:
   - listar projetos → `GET .../api/projects/index.php?scope=mine&ownerId=...`
   - carregar projeto → `GET ...?action=load&id=...`
   - renomear → `PUT ...?action=update&id=...`
   - apagar → `DELETE ...?action=delete&id=...`

## Publicar o frontend no Hostinger

- Defina `VITE_API_URL` no ambiente de build (ou no `.env` antes de correr `npm run build`).
- Fa�a upload de `dist/` para o `public_html` do dom�nio.

## Arquitetura e Documento Normativo

O arquivo `docs/PIMO-CRIATIVO-MASTER-PLAN.md` � a fonte de verdade arquitetural do projeto pimo-criativo.

Todas as decis�es de desenvolvimento (backend, frontend, permiss�es, roles, f�bricas, fases e demais aspectos estruturais) devem seguir esse documento.

Novas funcionalidades devem ser planejadas e implementadas em alinhamento com as fases definidas no master plan (FASE 0, FASE 1, FASE 2, etc.), mantendo evolu�o incremental e compatibilidade entre fases.

M�dulos avan�ados, como produ�o, IA e plugins, n�o devem ser iniciados antes da conclus�o s�lida das fases 0�4.

Consulte `docs/PIMO-CRIATIVO-MASTER-PLAN.md` para detalhes completos de arquitetura, fases e regras do sistema.

## Sistema de Eventos (Events System)

O documento oficial do Sistema de Eventos est�em `docs/PIMO-CRIATIVO-PLANO-EVENTS-SYSTEM.md`.

O Sistema de Eventos faz parte da arquitetura oficial do projeto pimo-criativo e � controlado pela feature flag global `features.eventsSystem`.

O valor padr�o da flag � `false`, garantindo que o sistema permane�a inativo at� ser explicitamente habilitado.

Com a flag desligada, o comportamento � totalmente no-op, sem impacto no fluxo principal da aplica�o.

Nesta fase inicial, nenhuma funcionalidade cr�tica do sistema depende exclusivamente do Events System.

Toda integra�o futura com eventos deve utilizar a fun�o central (ex.: `recordEvent`), conforme definido no plano oficial.

O desenvolvimento do Sistema de Eventos deve seguir as regras e fases definidas no Master Plan (`docs/PIMO-CRIATIVO-MASTER-PLAN.md`), e sua ativa�o deve ocorrer apenas ap�s a consolida�o das fases 0�4, conforme diretrizes arquiteturais.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
