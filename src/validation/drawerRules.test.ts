import { describe, expect, it } from "vitest";
import { calculateDrawerSpecs } from "../core/drawers";
import { settingsDefaults } from "../core/settings/settingsSchema";
import { validateSettings } from "../core/settings/settingsValidation";

describe("Drawer Rules — settings e parametrizacao", () => {
  it("normaliza as novas regras profissionais de gavetas", () => {
    const result = validateSettings({
      ...settingsDefaults,
      gavetas: {
        ...settingsDefaults.gavetas,
        gavetaTipoCorredica: "Blum Movento",
        gavetaTipoCaixaMetalica: "Blum Legrabox",
        gavetaTipoHandle: "Perfil Alumínio",
        gavetaPosicaoHandle: "Topo",
        gavetaCapacidadeCargaKg: 70,
      },
    });

    // Restrição industrial temporária (KHALED-PRO): só Quadro V6 / AvanTech + Nenhuma
    // são aceites — qualquer outro valor é normalizado para o default (sem erro).
    expect(result.normalized.gavetas.gavetaTipoCorredica).toBe(
      "Hettich Quadro V6 You M Silent System"
    );
    expect(result.normalized.gavetas.gavetaTipoCaixaMetalica).toBe("Nenhuma");
    expect(result.normalized.gavetas.gavetaTipoHandle).toBe("Perfil Alumínio");
    expect(result.normalized.gavetas.gavetaCapacidadeCargaKg).toBe(70);
  });

  it("aplica limites de altura e expõe avisos no domínio", () => {
    const specs = calculateDrawerSpecs(
      {
        boxInternalWidth: 562,
        boxInternalHeight: 720,
        boxInternalDepth: 560,
        boxThickness: 19,
        drawerHeight: 60,
        totalDrawers: 1,
        type: "normal",
      },
      settingsDefaults.gavetas.gavetaProfundidadesDisponiveisMm,
      {
        ...settingsDefaults.gavetas,
        gavetaAlturaMinimaMm: 80,
      }
    );

    expect(specs.validation.warnings.some((warning) => warning.includes("Altura da frente abaixo"))).toBe(true);
  });
});
