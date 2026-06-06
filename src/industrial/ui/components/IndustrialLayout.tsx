import type { ReactNode } from 'react';

export interface IndustrialLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function IndustrialLayout({ title, description, children }: IndustrialLayoutProps) {
  return (
    <main style={{ display: 'grid', gap: 24, padding: 24 }}>
      <header>
        <p style={{ margin: 0, color: '#64748b', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
          PIMO-TRAK Industrial
        </p>
        <h1 style={{ margin: '4px 0 0', fontSize: 28 }}>{title}</h1>
        {description ? <p style={{ margin: '8px 0 0', color: '#475569' }}>{description}</p> : null}
      </header>
      {children}
    </main>
  );
}
