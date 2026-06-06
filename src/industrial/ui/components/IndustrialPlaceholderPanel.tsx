export interface IndustrialPlaceholderPanelProps {
  module: string;
  nextStep: string;
}

export function IndustrialPlaceholderPanel({ module, nextStep }: IndustrialPlaceholderPanelProps) {
  return (
    <section
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: 12,
        padding: 20,
        background: '#f8fafc',
      }}
    >
      <h2 style={{ margin: 0, fontSize: 18 }}>{module}</h2>
      <p style={{ margin: '8px 0 0', color: '#475569' }}>
        Placeholder funcional preparado para ligar ao core industrial na Fase 3C.2.
      </p>
      <p style={{ margin: '12px 0 0', color: '#0f172a', fontWeight: 600 }}>{nextStep}</p>
    </section>
  );
}
