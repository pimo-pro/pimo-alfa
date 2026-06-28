import { industrialListItemStyle, industrialSectionTitleStyle } from '@/industrial/ui/layouts/industrialStyles';

import type { OperatorWorkOrderMessage } from '../types';

type Props = {
  messages: OperatorWorkOrderMessage[];
};

export default function OperatorMessagesPanel({ messages }: Props) {
  return (
    <section>
      <h3 style={{ ...industrialSectionTitleStyle, marginBottom: 8 }}>Mensagens industriais</h3>
      <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 6, maxHeight: 140, overflow: 'auto' }}>
        {messages.map((message) => (
          <li key={message.id} style={industrialListItemStyle}>
            <div style={{ fontSize: 11, fontWeight: 600 }}>{message.title}</div>
            <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>{message.body}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
