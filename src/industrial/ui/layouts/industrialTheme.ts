/**
 * Tokens visuais industriais alinhados ao tema global (ThemeContext).
 * Usar em Ordens / Estacoes em vez de cores hardcoded ou tone="light" forcado.
 */

import { useTheme } from '@/context/ThemeContext';

export type IndustrialLayoutTone = 'light' | 'dark';

export type IndustrialUiTokens = {
  pageBg: string;
  text: string;
  textStrong: string;
  muted: string;
  panelBg: string;
  panelBorder: string;
  inputBg: string;
  inputBorder: string;
  rowBorder: string;
  tableHeadBorder: string;
  link: string;
  linkMuted: string;
  btnPrimaryBg: string;
  btnPrimaryText: string;
  btnSecondaryBg: string;
  btnSecondaryText: string;
  btnSecondaryBorder: string;
};

export function industrialUi(tone: IndustrialLayoutTone): IndustrialUiTokens {
  if (tone === 'light') {
    return {
      pageBg: '#f8fafc',
      text: '#1e293b',
      textStrong: '#111827',
      muted: '#64748b',
      panelBg: '#ffffff',
      panelBorder: '#e2e8f0',
      inputBg: '#ffffff',
      inputBorder: '#cbd5e1',
      rowBorder: '#e2e8f0',
      tableHeadBorder: '#e2e8f0',
      link: '#2563eb',
      linkMuted: '#64748b',
      btnPrimaryBg: '#0f172a',
      btnPrimaryText: '#ffffff',
      btnSecondaryBg: '#ffffff',
      btnSecondaryText: '#0f172a',
      btnSecondaryBorder: '#cbd5e1',
    };
  }

  return {
    pageBg: '#0f172a',
    text: '#f1f5f9',
    textStrong: '#f9fafb',
    muted: '#94a3b8',
    panelBg: 'rgba(15, 23, 42, 0.92)',
    panelBorder: '#334155',
    inputBg: 'rgba(255,255,255,0.04)',
    inputBorder: '#334155',
    rowBorder: '#1e293b',
    tableHeadBorder: '#334155',
    link: '#60a5fa',
    linkMuted: '#94a3b8',
    btnPrimaryBg: '#2563eb',
    btnPrimaryText: '#ffffff',
    btnSecondaryBg: 'rgba(255,255,255,0.06)',
    btnSecondaryText: '#f1f5f9',
    btnSecondaryBorder: '#334155',
  };
}

/** Tone industrial a partir do tema global (dark/light). */
export function useIndustrialTone(): IndustrialLayoutTone {
  const { theme } = useTheme();
  return theme === 'light' ? 'light' : 'dark';
}
