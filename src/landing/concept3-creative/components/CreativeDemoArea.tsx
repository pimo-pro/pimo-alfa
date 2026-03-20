import React, { useRef } from 'react';

const CreativeDemoArea: React.FC = () => {
  const demoRef = useRef<HTMLDivElement>(null);

  function showDemo() {
    const demo = demoRef.current;
    if (!demo) return;
    demo.innerHTML = '';
    let t = 0;
    let running = true;
    function draw() {
      if (!running) return;
      demo.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        const box = document.createElement('div');
        box.style.position = 'absolute';
        box.style.left = `${30 + i * 60 + Math.sin(t + i) * 10}px`;
        box.style.top = `${30 + Math.cos(t + i) * 8}px`;
        box.style.width = '48px';
        box.style.height = '48px';
        box.style.background = ['#4f8cff','#ffb347','#a3e635','#f87171'][i];
        box.style.borderRadius = '8px';
        box.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)';
        demo.appendChild(box);
      }
      t += 0.05;
      requestAnimationFrame(draw);
    }
    draw();
    return () => { running = false; };
  }

  return (
    <div>
      <button className="start-btn" onClick={showDemo}>Try Demo Animation</button>
      <div id="demoArea" ref={demoRef}></div>
    </div>
  );
};

export default CreativeDemoArea;
