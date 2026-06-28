import { industrialListItemStyle, industrialSectionTitleStyle } from '@/industrial/ui/layouts/industrialStyles';
import type { OperatorOperationLogEntry } from '@/industrial/operador/types';

type Props = {
  entries: OperatorOperationLogEntry[];
};

export default function OperatorLogPanel({ entries }: Props) {
  return (
    <section>
      <h3 style={{ ...industrialSectionTitleStyle, marginBottom: 8 }}>Últimas operações</h3>
      {entries.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Nenhuma operação registada nesta sessão.</p>
      ) : (
        <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 6, maxHeight: 180, overflow: 'auto' }}>
          {entries.slice(0, 12).map((entry) => (
            <li key={entry.id} style={industrialListItemStyle}>
              <div style={{ fontSize: 11, fontWeight: 600 }}>
                {entry.operationType.toUpperCase()} · {entry.action === 'start' ? 'início' : 'conclusão'}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
                {entry.nqrCode ?? entry.pieceId}
              </div>
              <div style={{ fontSize: 10, color: '#64748b' }}>
                {new Date(entry.timestamp).toLocaleTimeString('pt-PT')}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
