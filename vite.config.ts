import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { attachMaterialsApiMiddleware } from './src/server/materialsApiMiddleware'
import { fileURLToPath, URL } from 'node:url'

const buildVersion = `${process.env.npm_package_version ?? '0.0.0'}+${(process.env.GITHUB_SHA ?? 'local').slice(0, 7)}`;
const projectRoot = fileURLToPath(new URL('.', import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    {
      name: 'exclude-tests-from-bundle',
      enforce: 'pre',
      resolveId(id) {
        const clean = id.split('?')[0] ?? id;
        if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(clean) || clean.includes('/__tests__/') || clean.includes('\\__tests__\\')) {
          return { id: clean, external: true };
        }
        return null;
      },
    },
    {
      name: 'materials-api-middleware',
      configureServer(server) {
        attachMaterialsApiMiddleware(server, projectRoot);
      },
      configurePreviewServer(server) {
        attachMaterialsApiMiddleware(server, projectRoot);
      },
    },
  ],
  assetsInclude: ['**/*.gltf'],
  server: {
    proxy: {
      '/api': {
        target: 'https://pimo.pro',
        changeOrigin: true,
        secure: true,
        bypass(req) {
          const u = req.url ?? '';
          if (u.startsWith('/api/materials')) return u;
        },
      },
    },
  },
  define: {
    __PIMO_VERSION__: JSON.stringify(buildVersion),
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      onwarn(warning, warn) {
        const message = warning?.message ?? "";
        const isMixedImportWarning =
          message.includes("is dynamically imported by") &&
          message.includes("but also statically imported by");
        if (isMixedImportWarning) {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks: {
          three: ['three'],
          pdf: ['jspdf', 'jspdf-autotable'],
          viewer: ['three/examples/jsm/controls/OrbitControls'],
          core: ['react', 'react-dom']
        },
      },
    },
  },
})
