/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ButtonShape, ThemeTemplateId } from "../theme/palettes/types";
import { ALL_THEME_TOKENS } from "../theme/palettes/tokenList";
import { BUTTON_SHAPE_ATTR, PI_BUTTON_SYSTEM_TOKENS } from "../theme/palettes/piButtonSystem";
import { getThemeTemplate, THEME_TEMPLATES } from "../theme/palettes/templateRegistry";
import {
  readStoredButtonShape,
  readStoredThemeTemplate,
  storeButtonShape,
  storeThemeTemplate,
} from "../theme/palettes/themeTemplateStorage";
import {
  resolvePiPaletteForMode,
  subscribePiTokenOverrides,
} from "../theme/palettes/piTokenOverridesApi";
import { useTheme } from "./ThemeContext";

/**
 * Aplica no <html> os overrides de token do template ativo (mescla a paleta
 * do template com eventuais overrides individuais guardados — Fase 6) para
 * o modo (dark/light) atual. Alpha nunca tem overrides: index.css já basta.
 */
/** Nomes dos tokens do sistema de botões unificado (Fase 4) — nunca existem no Alpha. */
const BUTTON_SYSTEM_TOKEN_NAMES = Object.keys(PI_BUTTON_SYSTEM_TOKENS.dark);

function applyTemplateTokens(templateId: ThemeTemplateId, mode: "dark" | "light") {
  const root = document.documentElement;

  // Limpa sempre primeiro, para não deixar valores de um template anterior presos via inline style.
  for (const token of ALL_THEME_TOKENS) {
    root.style.removeProperty(`--${token}`);
  }
  for (const token of BUTTON_SYSTEM_TOKEN_NAMES) {
    root.style.removeProperty(`--${token}`);
  }
  // Nunca deixar --pi-btn-radius no DOM (vaza para industrial via var(..., fallback)).
  root.style.removeProperty("--pi-btn-radius");

  if (templateId === "alpha") return;

  // Merge Fase 6: piPalette ← ciSsotBridge (vazio) ← userOverrides
  const merged = resolvePiPaletteForMode(mode);

  for (const [token, value] of Object.entries(merged)) {
    if (value) root.style.setProperty(`--${token}`, value);
  }

  // Sistema de botões unificado (Fase 4) — cores só quando o Pi está ativo.
  if (templateId === "pi") {
    for (const [token, value] of Object.entries(PI_BUTTON_SYSTEM_TOKENS[mode])) {
      if (value) root.style.setProperty(`--${token}`, value);
    }
  }
}

function applyTemplateToDocument(templateId: ThemeTemplateId) {
  document.documentElement.setAttribute("data-theme-template", templateId);
}

/** Remove atributo de shape e qualquer --pi-btn-radius residual (Alpha / troca de template). */
function clearButtonShapeFromDocument() {
  const root = document.documentElement;
  root.removeAttribute(BUTTON_SHAPE_ATTR);
  root.style.removeProperty("--pi-btn-radius");
}

/**
 * Shape só no Pi: atributo data-pi-button-shape para CSS gated.
 * Não define --pi-btn-radius no <html> (industrial continua no fallback local).
 */
function applyButtonShapeToDocument(shape: ButtonShape, templateId: ThemeTemplateId) {
  if (templateId !== "pi") {
    clearButtonShapeFromDocument();
    return;
  }
  const root = document.documentElement;
  root.setAttribute(BUTTON_SHAPE_ATTR, shape);
  root.style.removeProperty("--pi-btn-radius");
}

type ThemeTemplateContextValue = {
  template: ThemeTemplateId;
  setTemplate: (_id: ThemeTemplateId) => void;
  templates: typeof THEME_TEMPLATES;
  activeTemplateDefinition: ReturnType<typeof getThemeTemplate>;
  buttonShape: ButtonShape;
  setButtonShape: (_shape: ButtonShape) => void;
};

const ThemeTemplateContext = createContext<ThemeTemplateContextValue | null>(null);

export function ThemeTemplateProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const [template, setTemplateState] = useState<ThemeTemplateId>(readStoredThemeTemplate);
  const [buttonShape, setButtonShapeState] = useState<ButtonShape>(readStoredButtonShape);

  useEffect(() => {
    applyTemplateToDocument(template);
    applyTemplateTokens(template, theme);
    storeThemeTemplate(template);
  }, [template, theme]);

  // Fase 6: se a API de overrides gravar (editor futuro), reaplicar tokens sem remount.
  useEffect(() => {
    return subscribePiTokenOverrides(() => {
      applyTemplateTokens(template, theme);
    });
  }, [template, theme]);

  useEffect(() => {
    applyButtonShapeToDocument(buttonShape, template);
    storeButtonShape(buttonShape);
  }, [buttonShape, template]);

  const setTemplate = useCallback((next: ThemeTemplateId) => {
    setTemplateState(next);
  }, []);

  const setButtonShape = useCallback((next: ButtonShape) => {
    setButtonShapeState(next);
  }, []);

  const value = useMemo<ThemeTemplateContextValue>(
    () => ({
      template,
      setTemplate,
      templates: THEME_TEMPLATES,
      activeTemplateDefinition: getThemeTemplate(template),
      buttonShape,
      setButtonShape,
    }),
    [template, setTemplate, buttonShape, setButtonShape]
  );

  return <ThemeTemplateContext.Provider value={value}>{children}</ThemeTemplateContext.Provider>;
}

export function useThemeTemplate() {
  const ctx = useContext(ThemeTemplateContext);
  if (!ctx) {
    throw new Error("useThemeTemplate deve ser usado dentro de ThemeTemplateProvider");
  }
  return ctx;
}
