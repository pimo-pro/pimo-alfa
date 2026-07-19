/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ButtonShape, ThemeTemplateId } from "../theme/palettes/types";
import { ALL_THEME_TOKENS } from "../theme/palettes/tokenList";
import { PI_PALETTE_OVERRIDES } from "../theme/palettes/piPalette";
import { BUTTON_SHAPE_RADIUS_PX, PI_BUTTON_SYSTEM_TOKENS } from "../theme/palettes/piButtonSystem";
import { getThemeTemplate, THEME_TEMPLATES } from "../theme/palettes/templateRegistry";
import {
  readStoredButtonShape,
  readStoredThemeTemplate,
  readStoredTokenOverrides,
  storeButtonShape,
  storeThemeTemplate,
} from "../theme/palettes/themeTemplateStorage";
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

  if (templateId === "alpha") return;

  const basePalette = templateId === "pi" ? PI_PALETTE_OVERRIDES[mode] : {};
  const customOverrides = readStoredTokenOverrides()[mode];
  const merged = { ...basePalette, ...customOverrides };

  for (const [token, value] of Object.entries(merged)) {
    if (value) root.style.setProperty(`--${token}`, value);
  }

  // Sistema de botões unificado (Fase 4) — só existe quando o Pi está ativo.
  if (templateId === "pi") {
    for (const [token, value] of Object.entries(PI_BUTTON_SYSTEM_TOKENS[mode])) {
      if (value) root.style.setProperty(`--${token}`, value);
    }
  }
}

function applyTemplateToDocument(templateId: ThemeTemplateId) {
  document.documentElement.setAttribute("data-theme-template", templateId);
}

function applyButtonShapeToDocument(shape: ButtonShape) {
  const root = document.documentElement;
  root.setAttribute("data-pi-button-shape", shape);
  // Inofensivo para o Alpha: nenhuma regra do Alpha lê --pi-btn-radius.
  root.style.setProperty("--pi-btn-radius", BUTTON_SHAPE_RADIUS_PX[shape]);
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

  useEffect(() => {
    applyButtonShapeToDocument(buttonShape);
    storeButtonShape(buttonShape);
  }, [buttonShape]);

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
