import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Configuração Vitest para testes industriais (Fase 7) e validações.
 * Não altera build, TCN, topDrillable nem exportações CNC.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    environment: "node",
    globals: false,
  },
});
