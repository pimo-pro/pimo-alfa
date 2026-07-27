import type { ReactNode } from 'react';

export interface IndustrialLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function IndustrialLayout({ title, description, children }: IndustrialLayoutProps) {
  return (
    <main style={{ display: 'grid', gap: 20, padding: 24, color: '#f1f5f9', lineHeight: 1.5 }}>
      <header>
        <p
          style={{
            margin: 0,
            color: '#a3b2c2',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
            lineHeight: 1.5,
          }}
        >
          PIMO-TRAK Industrial
        </p>
        <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.5 }}>
          {title}
        </h1>
        {description ? (
          <p
            style={{
              margin: '10px 0 0',
              fontSize: 12,
              fontWeight: 400,
              color: '#a3b2c2',
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
