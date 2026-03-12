

const sections = [
  {
    title: "Como mover caixas no workspace",
    text: "Arraste as caixas livremente nos eixos X e Z. O movimento é sempre em tempo real no viewer.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#e0e0e0" stroke="#888" strokeWidth="1.5" />
        <path d="M12 7v10M7 12h10" stroke="#888" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2" fill="#888" />
      </svg>
    ),
    media: null,
  },
  {
    title: "Funcionalidade Shift durante o drag",
    text: "Durante o drag, se mantiver Shift pressionado: o movimento no eixo Z é ignorado, apenas o eixo X é atualizado. Sem Shift: movimento livre nos eixos X e Z.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="6" width="20" height="12" rx="2" fill="#e0e0e0" stroke="#888" strokeWidth="1.5" />
        <rect x="6" y="10" width="3" height="2" rx="0.5" fill="#888" />
        <rect x="11" y="10" width="3" height="2" rx="0.5" fill="#888" />
        <rect x="16" y="10" width="2" height="2" rx="0.5" fill="#888" />
        <rect x="6" y="13" width="12" height="2" rx="0.5" fill="#bbb" />
      </svg>
    ),
    media: null,
  },
  {
    title: "Seleção de caixas e menu de contexto",
    text: "Clique numa peça para a selecionar. Clique com o botão direito para abrir o menu de contexto e aceder às ações disponíveis.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="16" rx="2" fill="#e0e0e0" stroke="#888" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="4" fill="#888" />
      </svg>
    ),
    media: null,
  },
  {
    title: "Alterar material do box",
    text: "Selecione o box desejado, aceda ao menu de contexto e escolha 'Alterar material'.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <rect width="256" height="256" fill="#c99a6b" />
        <rect width="256" height="256" fill="url(#grain)" opacity="0.9" />
        <defs>
          <linearGradient id="grain" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d9b48a" />
            <stop offset="0.5" stopColor="#b4835a" />
            <stop offset="1" stopColor="#d9b48a" />
          </linearGradient>
        </defs>
      </svg>
    ),
    media: null,
  },
  {
    title: "Alterar material da porta",
    text: "Selecione a porta do box, aceda ao menu de contexto e escolha 'Alterar material da porta'.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="16" rx="2" fill="#e0e0e0" stroke="#888" strokeWidth="1.5" />
        <rect x="10" y="8" width="4" height="8" rx="1" fill="#b4835a" />
        <circle cx="12" cy="12" r="1.2" fill="#888" />
      </svg>
    ),
    media: null,
  },
  {
    title: "Como funciona a abertura da porta",
    text: "Clique na porta para abrir ou fechar. A animação mostra a porta a mover-se em tempo real.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="16" rx="2" fill="#e0e0e0" stroke="#888" strokeWidth="1.5" />
        <rect x="10" y="8" width="4" height="8" rx="1" fill="#b4835a" />
        <circle cx="12" cy="12" r="1.2" fill="#888" />
      </svg>
    ),
    media: null,
  },
  {
    title: "Botão 'Alinhar pela frente do box ao lado'",
    text: "Alinha a frente do módulo com o box ao lado no eixo Z. Use para manter os módulos alinhados.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="8" width="16" height="8" rx="2" fill="#e0e0e0" stroke="#888" strokeWidth="1.5" />
        <rect x="8" y="10" width="8" height="4" rx="1" fill="#888" />
      </svg>
    ),
    media: null,
  },
];

function Ajuda() {
  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#f7f8fa', padding: 0, margin: 0 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 0' }}>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 700, textAlign: 'center', marginBottom: 40, letterSpacing: '-1px', color: '#222' }}>Ajuda</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 32 }}>
          {sections.map((section, idx) => (
            <div key={idx} style={{
              background: '#fff',
              borderRadius: 18,
              boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 32,
              minHeight: 220,
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ marginBottom: 18 }}>{section.icon}</div>
                <h2 style={{ fontSize: '1.7rem', fontWeight: 600, marginBottom: 12, color: '#222' }}>{section.title}</h2>
                <p style={{ fontSize: '1.15rem', color: '#444', marginBottom: 0 }}>{section.text}</p>
              </div>
              <div style={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                {/* Espaço reservado para imagem, vídeo ou carrossel */}
                {section.media ? section.media : (
                  <div style={{ width: 180, height: 120, background: '#f3f4f6', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 18 }}>
                    Imagem/Vídeo
                  </div>
                )}
              </div>
              {idx < sections.length - 1 && (
                <div style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: 2, background: '#f3f4f6' }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Ajuda;
