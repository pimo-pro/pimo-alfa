# PIMO v3 — Deploy Frontend (Hostinger) + Backend (Render)

Este repositório contém:

- **Frontend** (Vite/React) na raiz
- **Backend Node.js** em `backend/` (Express) para `/api/projects` e `/api/materials`

## Publicar o backend no Render

### Opção A) Blueprint com `render.yaml`

O ficheiro `backend/render.yaml` já está preparado com:

- `rootDir: backend`
- `buildCommand: npm install && npm run build`
- `startCommand: npm run start`
- env vars: `PORT`, `PIMO_PROJECTS_DATA_DIR`

No Render:

- Crie um **New → Blueprint**
- Selecione este repositório
- Confirme que o serviço chama **`pimo-backend`**

### Variáveis de ambiente (Render)

- **`PORT`**: o Render injeta automaticamente; pode deixar como está.
- **`PIMO_PROJECTS_DATA_DIR`**: diretório para gravar os projetos em JSON.
  - No Render, use um caminho persistente (ex.: `/var/data/pimo/projects`) e conecte um **Disk** ao serviço.

## Configurar o frontend para usar o backend do Render

O frontend lê a variável `VITE_API_URL` para chamar a API:

- projetos: `VITE_API_URL + /api/projects/index.php`
- materiais: `VITE_API_URL + /api/materials`

### Em produção (Hostinger)

No build do frontend, defina:

- **`VITE_API_URL=https://pimo-backend.onrender.com`**

No repositório, existe um `.env` para desenvolvimento e um `.env.example` como referência.

## Testar o fluxo completo

1. **Backend**: abra `GET /health` no serviço do Render para confirmar que está online.
2. **Frontend**: abra o site em `pimo.pro`.
3. DevTools → Network:
   - Abrir modal de materiais → deve fazer `GET {VITE_API_URL}/api/materials`
   - Clicar **“Gerar e Salvar Design”** → deve fazer `POST {VITE_API_URL}/api/projects/index.php`
4. Testar também:
   - listar projetos → `GET .../api/projects/index.php?scope=mine&ownerId=...`
   - carregar projeto → `GET ...?action=load&id=...`
   - renomear → `PUT ...?action=update&id=...`
   - apagar → `DELETE ...?action=delete&id=...`

## Publicar o frontend no Hostinger

- Defina `VITE_API_URL` no ambiente de build (ou no `.env` antes de correr `npm run build`).
- Faça upload de `dist/` para o `public_html` do domínio.

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
