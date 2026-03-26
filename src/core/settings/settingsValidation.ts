/**
 * Validação e normalização de configurações globais.
 */

import { PI_MODEL_DEFAULT_SETTINGS, clampPiNumeroGavetas } from "../../data/moveisUnificados/pi/settings";
import { SETTINGS_SCHEMA_VERSION, settingsDefaults, type SettingsSchema } from "./settingsSchema";
import { clamp, deepMergeSettings, normalizeDepths, toNumber, type ValidationResult } from "./settingsMerge";

export function validateSettings(input: Partial<SettingsSchema> | SettingsSchema): ValidationResult {
  const merged = deepMergeSettings(settingsDefaults, input);
  const errors: string[] = [];

  const normalized: SettingsSchema = {
    ...merged,
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    geral: {
      locale: typeof merged.geral.locale === "string" && merged.geral.locale.trim() ? merged.geral.locale.trim() : settingsDefaults.geral.locale,
      theme: merged.geral.theme === "light" || merged.geral.theme === "system" ? merged.geral.theme : "dark",
      autosaveEnabled: Boolean(merged.geral.autosaveEnabled),
      debugMode: Boolean(merged.geral.debugMode),
    },
    fabrica: {
      toleranciaCorteMm: clamp(toNumber(merged.fabrica.toleranciaCorteMm, settingsDefaults.fabrica.toleranciaCorteMm), 0, 10),
    },
    precos: {
      margemPercentual: clamp(toNumber(merged.precos.margemPercentual, settingsDefaults.precos.margemPercentual), 0, 500),
      multiplicadorBase: clamp(toNumber(merged.precos.multiplicadorBase, settingsDefaults.precos.multiplicadorBase), 0.1, 100),
      valorHoraMaquina: clamp(toNumber(merged.precos.valorHoraMaquina, settingsDefaults.precos.valorHoraMaquina), 0, 10000),
    },
    materiais: {
      categoriaPadraoId: typeof merged.materiais.categoriaPadraoId === "string" && merged.materiais.categoriaPadraoId.trim()
        ? merged.materiais.categoriaPadraoId.trim()
        : settingsDefaults.materiais.categoriaPadraoId,
      presetVisualPadraoId: typeof merged.materiais.presetVisualPadraoId === "string" && merged.materiais.presetVisualPadraoId.trim()
        ? merged.materiais.presetVisualPadraoId.trim()
        : settingsDefaults.materiais.presetVisualPadraoId,
      materialIndustrialPadraoId: typeof merged.materiais.materialIndustrialPadraoId === "string" && merged.materiais.materialIndustrialPadraoId.trim()
        ? merged.materiais.materialIndustrialPadraoId.trim()
        : settingsDefaults.materiais.materialIndustrialPadraoId,
      sheetWidthMm: clamp(
        toNumber(merged.materiais.sheetWidthMm, settingsDefaults.materiais.sheetWidthMm),
        500,
        10000
      ),
      sheetHeightMm: clamp(
        toNumber(merged.materiais.sheetHeightMm, settingsDefaults.materiais.sheetHeightMm),
        500,
        10000
      ),
      sheetThicknessMm: clamp(
        toNumber(merged.materiais.sheetThicknessMm, settingsDefaults.materiais.sheetThicknessMm),
        1,
        120
      ),
      sheetName:
        typeof merged.materiais.sheetName === "string" && merged.materiais.sheetName.trim()
          ? merged.materiais.sheetName.trim()
          : settingsDefaults.materiais.sheetName,
    },
    cnc: {
      profundidadeCortePadraoMm: clamp(toNumber(merged.cnc.profundidadeCortePadraoMm, settingsDefaults.cnc.profundidadeCortePadraoMm), 0, 200),
      offsetFerramentaPadraoMm: clamp(toNumber(merged.cnc.offsetFerramentaPadraoMm, settingsDefaults.cnc.offsetFerramentaPadraoMm), -50, 50),
      toleranciaPosicionamentoMm: clamp(toNumber(merged.cnc.toleranciaPosicionamentoMm, settingsDefaults.cnc.toleranciaPosicionamentoMm), 0, 10),
      diametroFresaContornoMm: clamp(toNumber(merged.cnc.diametroFresaContornoMm, settingsDefaults.cnc.diametroFresaContornoMm), 0, 30),
      tcnMetodo:
        merged.cnc.tcnMetodo === "v2_ramp" ||
        merged.cnc.tcnMetodo === "v3_ramp_noflip" ||
        merged.cnc.tcnMetodo === "v4_corner_noflip" ||
        merged.cnc.tcnMetodo === "v5_ramp_noanchor" ||
        merged.cnc.tcnMetodo === "v6_ramp"
          ? merged.cnc.tcnMetodo
          : "v1_corner",
      zSafetyMm: clamp(toNumber(merged.cnc.zSafetyMm, settingsDefaults.cnc.zSafetyMm), 0, 100),
      minSpacingMm: clamp(toNumber(merged.cnc.minSpacingMm, settingsDefaults.cnc.minSpacingMm), 0, 200),
      contourEntryMode: merged.cnc.contourEntryMode === "midside" ? "midside" : "corner",
      contourCloseExplicit: Boolean(merged.cnc.contourCloseExplicit),
      toolFeedRate: clamp(toNumber(merged.cnc.toolFeedRate, settingsDefaults.cnc.toolFeedRate), 1, 20000),
      toolRpm: clamp(toNumber(merged.cnc.toolRpm, settingsDefaults.cnc.toolRpm), 1000, 50000),
      drillFeedRate: clamp(toNumber(merged.cnc.drillFeedRate, settingsDefaults.cnc.drillFeedRate), 1, 20000),
      drillRpm: clamp(toNumber(merged.cnc.drillRpm, settingsDefaults.cnc.drillRpm), 1000, 50000),
      sheetMarginMm: clamp(toNumber(merged.cnc.sheetMarginMm, settingsDefaults.cnc.sheetMarginMm), 0, 100),
      rampDistanceMm: clamp(toNumber(merged.cnc.rampDistanceMm, settingsDefaults.cnc.rampDistanceMm), 5, 100),
    },
    nesting: {
      kerfPadraoMm: clamp(toNumber(merged.nesting.kerfPadraoMm, settingsDefaults.nesting.kerfPadraoMm), 0, 20),
      permitirRotacaoGlobal: Boolean(merged.nesting.permitirRotacaoGlobal),
      prioridadeAproveitamento:
        merged.nesting.prioridadeAproveitamento === "area" || merged.nesting.prioridadeAproveitamento === "chapas"
          ? merged.nesting.prioridadeAproveitamento
          : "balanceado",
    },
    portas: {
      portaGapVerticalMm: clamp(toNumber(merged.portas.portaGapVerticalMm, settingsDefaults.portas.portaGapVerticalMm), 0, 20),
      portaGapHorizontalMm: clamp(toNumber(merged.portas.portaGapHorizontalMm, settingsDefaults.portas.portaGapHorizontalMm), 0, 20),
      portaGapDuplaMm: clamp(toNumber(merged.portas.portaGapDuplaMm, settingsDefaults.portas.portaGapDuplaMm), 0, 50),
      portaPosZOffsetMm: clamp(toNumber(merged.portas.portaPosZOffsetMm, settingsDefaults.portas.portaPosZOffsetMm), 0, 50),
    },
    gavetas: {
      gavetaNormalBaseEspessuraMm: clamp(
        toNumber(merged.gavetas.gavetaNormalBaseEspessuraMm, settingsDefaults.gavetas.gavetaNormalBaseEspessuraMm),
        0,
        50
      ),
      gavetaProBaseEspessuraMm: clamp(
        toNumber(merged.gavetas.gavetaProBaseEspessuraMm, settingsDefaults.gavetas.gavetaProBaseEspessuraMm),
        0,
        50
      ),
      gavetaFolgaLateralMm: clamp(
        toNumber(merged.gavetas.gavetaFolgaLateralMm, settingsDefaults.gavetas.gavetaFolgaLateralMm),
        0,
        30
      ),
      gavetaProfundidadesDisponiveisMm: normalizeDepths(
        merged.gavetas.gavetaProfundidadesDisponiveisMm,
        settingsDefaults.gavetas.gavetaProfundidadesDisponiveisMm
      ),
      gavetaAlturaModoPadrao:
        merged.gavetas.gavetaAlturaModoPadrao === "top_small_mid_medium_bottom_large" || merged.gavetas.gavetaAlturaModoPadrao === "custom"
          ? merged.gavetas.gavetaAlturaModoPadrao
          : "equal",
    },
    modeloPI: {
      espessuraMadeiraMm: clamp(
        toNumber(merged.modeloPI?.espessuraMadeiraMm, PI_MODEL_DEFAULT_SETTINGS.espessuraMadeiraMm),
        10,
        40
      ),
      ativarFuracaoPrateleiras: Boolean(
        merged.modeloPI?.ativarFuracaoPrateleiras ?? PI_MODEL_DEFAULT_SETTINGS.ativarFuracaoPrateleiras
      ),
      ativarFuracaoDobradicas: Boolean(
        merged.modeloPI?.ativarFuracaoDobradicas ?? PI_MODEL_DEFAULT_SETTINGS.ativarFuracaoDobradicas
      ),
      ativarFuracaoGavetas: Boolean(
        merged.modeloPI?.ativarFuracaoGavetas ?? PI_MODEL_DEFAULT_SETTINGS.ativarFuracaoGavetas
      ),
      sistemaGavetas:
        merged.modeloPI?.sistemaGavetas === "AvanTech YOU XL" || merged.modeloPI?.sistemaGavetas === "AvanTech YOU M"
          ? merged.modeloPI.sistemaGavetas
          : "AvanTech YOU L",
      comprimentoCorredicaMm: clamp(
        toNumber(merged.modeloPI?.comprimentoCorredicaMm, PI_MODEL_DEFAULT_SETTINGS.comprimentoCorredicaMm),
        250,
        650
      ),
      numeroGavetas: clampPiNumeroGavetas(
        toNumber(merged.modeloPI?.numeroGavetas, PI_MODEL_DEFAULT_SETTINGS.numeroGavetas)
      ),
      tipoFrente:
        merged.modeloPI?.tipoFrente === "inset" || merged.modeloPI?.tipoFrente === "overlay"
          ? merged.modeloPI.tipoFrente
          : "full_overlay",
    },
    ferragens: {
      cavilha: {
        diametro: clamp(
          toNumber(merged.ferragens.cavilha.diametro, settingsDefaults.ferragens.cavilha.diametro),
          1,
          50
        ),
        profundidade: clamp(
          toNumber(merged.ferragens.cavilha.profundidade, settingsDefaults.ferragens.cavilha.profundidade),
          1,
          100
        ),
        distanciaBorda: clamp(
          toNumber(merged.ferragens.cavilha.distanciaBorda, settingsDefaults.ferragens.cavilha.distanciaBorda),
          0,
          200
        ),
        ativo: Boolean(merged.ferragens.cavilha.ativo),
      },
      parafuso: {
        diametro: clamp(
          toNumber(merged.ferragens.parafuso.diametro, settingsDefaults.ferragens.parafuso.diametro),
          1,
          20
        ),
        comprimento: clamp(
          toNumber(merged.ferragens.parafuso.comprimento, settingsDefaults.ferragens.parafuso.comprimento),
          1,
          200
        ),
        ativo: Boolean(merged.ferragens.parafuso.ativo),
      },
      corredica: {
        tipo:
          typeof merged.ferragens.corredica.tipo === "string" && merged.ferragens.corredica.tipo.trim()
            ? merged.ferragens.corredica.tipo.trim()
            : settingsDefaults.ferragens.corredica.tipo,
        folga: clamp(
          toNumber(merged.ferragens.corredica.folga, settingsDefaults.ferragens.corredica.folga),
          0,
          50
        ),
        ativo: Boolean(merged.ferragens.corredica.ativo),
      },
    },
    viewer: {
      qualidade: merged.viewer.qualidade === "baixa" || merged.viewer.qualidade === "media" ? merged.viewer.qualidade : "alta",
      luzIntensidade: clamp(toNumber(merged.viewer.luzIntensidade, settingsDefaults.viewer.luzIntensidade), 0, 4),
      mostrarGrid: Boolean(merged.viewer.mostrarGrid),
    },
    furação: {
      parafuso: {
        frontDistance: clamp(
          toNumber(
            merged.furação?.parafuso?.frontDistance ??
              (merged.furação?.parafuso as Record<string, unknown> | undefined)?.distanciaFrenteParafuso,
            settingsDefaults.furação.parafuso.frontDistance
          ),
          5,
          500
        ),
        backDistance: clamp(
          toNumber(
            merged.furação?.parafuso?.backDistance ??
              (merged.furação?.parafuso as Record<string, unknown> | undefined)?.distanciaFrenteParafuso,
            settingsDefaults.furação.parafuso.backDistance
          ),
          5,
          500
        ),
        offsetDaBorda: clamp(
          toNumber(merged.furação?.parafuso?.offsetDaBorda, settingsDefaults.furação.parafuso.offsetDaBorda),
          3,
          50
        ),
        sideOffset: clamp(
          toNumber(merged.furação?.parafuso?.sideOffset, settingsDefaults.furação.parafuso.sideOffset),
          3,
          50
        ),
      },
      cavilha: {
        frontDistance: clamp(
          toNumber(
            merged.furação?.cavilha?.frontDistance ??
              (merged.furação?.parafuso as Record<string, unknown> | undefined)?.distanciaFrenteCavilha,
            settingsDefaults.furação.cavilha.frontDistance
          ),
          5,
          500
        ),
        backDistance: clamp(
          toNumber(
            merged.furação?.cavilha?.backDistance ??
              (merged.furação?.parafuso as Record<string, unknown> | undefined)?.distanciaFrenteCavilha,
            settingsDefaults.furação.cavilha.backDistance
          ),
          5,
          500
        ),
        sideOffset: clamp(
          toNumber(merged.furação?.cavilha?.sideOffset, settingsDefaults.furação.cavilha.sideOffset),
          3,
          50
        ),
      },
      prateleira: {
        margemTop: clamp(toNumber(merged.furação?.prateleira?.margemTop, settingsDefaults.furação.prateleira.margemTop), 0, 500),
        margemBottom: clamp(toNumber(merged.furação?.prateleira?.margemBottom, settingsDefaults.furação.prateleira.margemBottom), 0, 500),
        minFuros: clamp(toNumber(merged.furação?.prateleira?.minFuros, settingsDefaults.furação.prateleira.minFuros), 2, 100),
        maxFuros: clamp(toNumber(merged.furação?.prateleira?.maxFuros, settingsDefaults.furação.prateleira.maxFuros), 2, 100),
        espacamentoVertical: clamp(
          toNumber(merged.furação?.prateleira?.espacamentoVertical, settingsDefaults.furação.prateleira.espacamentoVertical),
          16,
          64
        ),
        distanciaDaBorda: clamp(
          toNumber(merged.furação?.prateleira?.distanciaDaBorda, settingsDefaults.furação.prateleira.distanciaDaBorda),
          5,
          80
        ),
      },
      dobradica: {
        distanciaCentroDaBorda: clamp(
          toNumber(merged.furação?.dobradica?.distanciaCentroDaBorda, settingsDefaults.furação.dobradica.distanciaCentroDaBorda),
          15,
          35
        ),
        distanciaDobradiçaTopo: clamp(
          toNumber(merged.furação?.dobradica?.distanciaDobradiçaTopo, settingsDefaults.furação.dobradica.distanciaDobradiçaTopo),
          20,
          300
        ),
        distanciaDobradiçaFundo: clamp(
          toNumber(merged.furação?.dobradica?.distanciaDobradiçaFundo, settingsDefaults.furação.dobradica.distanciaDobradiçaFundo),
          20,
          300
        ),
        numeroPorPorta: clamp(
          toNumber(merged.furação?.dobradica?.numeroPorPorta, settingsDefaults.furação.dobradica.numeroPorPorta),
          1,
          6
        ),
        distribuicaoAutomatica: Boolean(merged.furação?.dobradica?.distribuicaoAutomatica ?? settingsDefaults.furação.dobradica.distribuicaoAutomatica),
      },
      dobradicaFixacao: {
        distanciaDaBordaCalco: clamp(
          toNumber(
            (merged.furação?.dobradicaFixacao as Record<string, unknown> | undefined)?.distanciaDaBordaCalco ??
              (merged.furação?.dobradicaFixacao as Record<string, unknown> | undefined)?.distanciaDaBorda,
            settingsDefaults.furação.dobradicaFixacao.distanciaDaBordaCalco
          ),
          5,
          80
        ),
        distanciaDaBordaParafusoUniao: clamp(
          toNumber(merged.furação?.dobradicaFixacao?.distanciaDaBordaParafusoUniao, settingsDefaults.furação.dobradicaFixacao.distanciaDaBordaParafusoUniao),
          10,
          100
        ),
        distanciaEntreFurosCalco: clamp(
          toNumber(
            (merged.furação?.dobradicaFixacao as Record<string, unknown> | undefined)?.distanciaEntreFurosCalco ??
              (merged.furação?.dobradicaFixacao as Record<string, unknown> | undefined)?.distanciaEntreFuros,
            settingsDefaults.furação.dobradicaFixacao.distanciaEntreFurosCalco
          ),
          10,
          80
        ),
        profundidadeFuro: clamp(
          toNumber(merged.furação?.dobradicaFixacao?.profundidadeFuro, settingsDefaults.furação.dobradicaFixacao.profundidadeFuro),
          5,
          25
        ),
        diametro: clamp(toNumber(merged.furação?.dobradicaFixacao?.diametro, settingsDefaults.furação.dobradicaFixacao.diametro), 3, 10),
        diametroParafusoUniao: clamp(toNumber(merged.furação?.dobradicaFixacao?.diametroParafusoUniao, settingsDefaults.furação.dobradicaFixacao.diametroParafusoUniao), 3, 10),
        profundidadeParafusoUniao: clamp(toNumber(merged.furação?.dobradicaFixacao?.profundidadeParafusoUniao, settingsDefaults.furação.dobradicaFixacao.profundidadeParafusoUniao), 0.5, 25),
      },
    },
    etiquetasQr: {
      logoAtivado: Boolean(merged.etiquetasQr?.logoAtivado ?? settingsDefaults.etiquetasQr.logoAtivado),
      logoDataUrl: typeof merged.etiquetasQr?.logoDataUrl === "string" ? merged.etiquetasQr.logoDataUrl : undefined,
      logoTamanhoPorcento: clamp(
        toNumber(merged.etiquetasQr?.logoTamanhoPorcento, settingsDefaults.etiquetasQr.logoTamanhoPorcento),
        10,
        30
      ),
    },
  };

  if (normalized.materiais.sheetThicknessMm > normalized.materiais.sheetWidthMm) {
    errors.push("Espessura padrão da fábrica parece inválida para a largura de chapa.");
  }

  return { valid: errors.length === 0, errors, normalized };
}
