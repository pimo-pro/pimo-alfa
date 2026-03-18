'use client';

import { useState, useCallback } from 'react';

const styles = `
  .pi-loader-overlay {
    position: fixed;
    inset: 0;
    background: rgba(8, 6, 20, 0.35); /* خلفية شفافة مع تعتيم خفيف */
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.4s ease;
  }
  .pi-loader-overlay.pi-visible {
    opacity: 1;
    pointer-events: all;
  }

  /* الحجم الجديد أكبر بنسبة 25% */
  .pi-spinner-wrap {
    position: relative;
    width: 140px;
    height: 140px;
  }

  .pi-symbol {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: Georgia, serif;
    font-size: 52px;
    font-weight: bold;
    background: linear-gradient(135deg, #F5A623 0%, #F0534A 35%, #9B59B6 55%, #1ABC9C 75%, #2E86DE 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 0 12px rgba(240, 83, 74, 0.5));
    animation: pi-breathe 2.4s ease-in-out infinite;
    z-index: 3;
  }

  @keyframes pi-breathe {
    0%, 100% { transform: scale(1);    filter: drop-shadow(0 0 10px rgba(240,83,74,0.4)); }
    50%       { transform: scale(1.12); filter: drop-shadow(0 0 22px rgba(26,188,156,0.65)); }
  }

  .pi-ring {
    position: absolute;
    border-radius: 50%;
    animation: pi-spin var(--spd) linear infinite;
    animation-direction: var(--dir, normal);
  }

  @keyframes pi-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  /* ثلاث حلقات */
  .pi-ring.r1 { --spd: 6s;  --dir: normal;  inset: 10px;  }
  .pi-ring.r2 { --spd: 9s;  --dir: reverse; inset: -6px;  }
  .pi-ring.r3 { --spd: 12s; --dir: normal;  inset: -22px; }

  .pi-digit {
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  .pi-digit span {
    display: block;
    font-family: Georgia, serif;
    font-weight: 600;
    line-height: 1;
    animation: pi-pulse var(--spd) linear infinite;
    animation-delay: var(--dl, 0s);
  }

  @keyframes pi-pulse {
    0%, 100% { opacity: 0.3; transform: scale(0.85); }
    50%       { opacity: 1;   transform: scale(1.25); }
  }

  /* الحلقة الأولى — 12 رقم */
  .r1 .pi-digit:nth-child(n) { --dl: calc(-0.5s * var(--i)); transform: rotate(calc(30deg * var(--i))); }
  .r1 .pi-digit span { color: #F5A623; font-size: 13px; }

  /* الحلقة الثانية — 16 رقم */
  .r2 .pi-digit:nth-child(n) { --dl: calc(-0.4s * var(--i)); transform: rotate(calc(22.5deg * var(--i))); }
  .r2 .pi-digit span { color: #9B59B6; font-size: 12px; }

  /* الحلقة الثالثة — 20 رقم */
  .r3 .pi-digit:nth-child(n) { --dl: calc(-0.3s * var(--i)); transform: rotate(calc(18deg * var(--i))); }
  .r3 .pi-digit span { color: #2E86DE; font-size: 11px; }

  .pi-loader-text {
    margin-top: 1.6rem;
    font-family: Georgia, serif;
    font-size: 14px;
    letter-spacing: 0.14em;
    background: linear-gradient(90deg, #F5A623, #F0534A, #9B59B6, #1ABC9C, #2E86DE, #F5A623);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    background-size: 300%;
    animation: pi-shimmer 3s linear infinite;
  }

  @keyframes pi-shimmer {
    0%   { background-position: 0%; }
    100% { background-position: 300%; }
  }
`;

function PiLoaderOverlay({ visible, text }) {
  const ring1 = [3,1,4,1,5,9,2,6,5,3,5,8];
  const ring2 = [9,7,9,3,2,3,8,4,6,2,6,4,3,3,8,3];
  const ring3 = [2,7,9,5,0,2,8,8,4,1,9,7,1,6,9,3,9,9,3,7];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className={`pi-loader-overlay${visible ? ' pi-visible' : ''}`}>
        <div className="pi-spinner-wrap">
          <div className="pi-symbol">π</div>

          <div className="pi-ring r1">
            {ring1.map((d, i) => (
              <div key={i} className="pi-digit" style={{ "--i": i }}>
                <span>{d}</span>
              </div>
            ))}
          </div>

          <div className="pi-ring r2">
            {ring2.map((d, i) => (
              <div key={i} className="pi-digit" style={{ "--i": i }}>
                <span>{d}</span>
              </div>
            ))}
          </div>

          <div className="pi-ring r3">
            {ring3.map((d, i) => (
              <div key={i} className="pi-digit" style={{ "--i": i }}>
                <span>{d}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pi-loader-text">{text}</div>
      </div>
    </>
  );
}

export function usePiLoader() {
  const [state, setState] = useState({ visible: false, text: 'A carregar...' });

  const show = useCallback((text = 'A carregar...') => {
    setState({ visible: true, text });
  }, []);

  const hide = useCallback(() => {
    setState(s => ({ ...s, visible: false }));
  }, []);

  const LoaderUI = useCallback(
    () => <PiLoaderOverlay visible={state.visible} text={state.text} />,
    [state]
  );

  return { LoaderUI, show, hide };
}

export const PT = {
  carregar: 'A carregar...',
  navegar: 'A navegar...',
  processar: 'A processar...',
  guardar: 'A guardar...',
  projeto: 'A preparar o seu projeto...',
  calcular: 'A calcular...',
  enviar: 'A enviar...',
  confirmar: 'A confirmar...',
};