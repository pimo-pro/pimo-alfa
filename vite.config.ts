import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const buildVersion = `${process.env.npm_package_version ?? '0.0.0'}+${(process.env.GITHUB_SHA ?? 'local').slice(0, 7)}`;

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
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
