import type { CSSProperties, ReactNode } from 'react';

import {
  industrialUi,
  useIndustrialTone,
  type IndustrialLayoutTone,
} from '@/industrial/ui/layouts/industrialTheme';

export type { IndustrialLayoutTone };

export interface IndustrialLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  /**
   * Tema do layout. `undefined` / omitido → segue o toggle global (ThemeContext).
   * Passar explicitamente só quando for preciso forçar (legado).
   */
  tone?: IndustrialLayoutTone;
}

export function IndustrialLayout({
  title,
  description,
  children,
  tone: toneProp,
}: IndustrialLayoutProps) {
  const themeTone = useIndustrialTone();
  const tone = toneProp ?? themeTone;
  const ui = industrialUi(tone);

  const mainStyle: CSSProperties = {
    display: 'grid',
    gap: 20,
    padding: 24,
    color: ui.text,
    background: ui.pageBg,
    lineHeight: 1.5,
    minHeight: '100%',
  };

  return (
    <main style={mainStyle} data-industrial-tone={tone}>
      <header>
        <p
          style={{
            margin: 0,
            color: ui.muted,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
            lineHeight: 1.5,
          }}
        >
          PIMO-TRAK Industrial
        </p>
        <h1
          style={{
            margin: '4px 0 0',
            fontSize: 28,
            fontWeight: 700,
            color: ui.textStrong,
            lineHeight: 1.5,
          }}
        >
          {title}
        </h1>
        {description ? (
          <p
            style={{
              margin: '10px 0 0',
              fontSize: 12,
              fontWeight: 400,
              color: ui.muted,
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </main>
  );
}
