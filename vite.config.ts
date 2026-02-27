import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
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
