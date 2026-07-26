import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

/**
 * Configura�o Vitest para testes industriais (Fase 7) e valida�es.
 * Alias `@` alinhado ao vite.config (necess�rio para IndustrialCenter / live store).
 * N�o altera build, TCN, topDrillable nem exporta�es CNC.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    environment: "node",
    globals: false,
  },
});
