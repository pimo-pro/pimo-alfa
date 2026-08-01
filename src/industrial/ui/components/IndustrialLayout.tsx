import type { CSSProperties, ReactNode } from 'react';

export type IndustrialLayoutTone = 'light' | 'dark';

export interface IndustrialLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  /** light = texto #1e1e1e em fundo claro (Ordens/Estações). dark = Operador/legado. */
  tone?: IndustrialLayoutTone;
}

export function IndustrialLayout({
  title,
  description,
  children,
  tone = 'dark',
}: IndustrialLayoutProps) {
  const isLight = tone === 'light';
  const mainStyle: CSSProperties = {
    display: 'grid',
    gap: 20,
    padding: 24,
    color: isLight ? '#1e1e1e' : '#f1f5f9',
    background: isLight ? '#f8fafc' : undefined,
    lineHeight: 1.5,
    minHeight: '100%',
  };

  return (
    <main style={mainStyle} data-industrial-tone={tone}>
      <header>
        <p
          style={{
            margin: 0,
            color: isLight ? '#64748b' : '#a3b2c2',
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
            color: isLight ? '#1e1e1e' : '#f1f5f9',
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
              color: isLight ? '#475569' : '#a3b2c2',
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
