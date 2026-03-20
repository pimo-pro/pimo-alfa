import React, { useRef } from 'react';
import './styles.css';

const Concept3Creative: React.FC = () => { 
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
      <section className="creative-hero">
        <h1>Unleash Your Creativity</h1>
        <p>Design, visualize, and manufacture custom furniture with Pimo-Criativo.</p>
        <button className="start-btn" onClick={showDemo}>Try Demo Animation</button>
      </section>
      <section className="creative-features">
        <div className="feature">
          <h2>Interactive Design</h2>
          <p>Drag, resize, and preview cabinet modules in real time.</p>
        </div>
        <div className="feature">
          <h2>Smart Materials</h2>
          <p>Instantly apply textures and finishes for realistic previews.</p>
        </div>
        <div className="feature">
          <h2>Production Ready</h2>
          <p>Export cutlists and manufacturing files with a single click.</p>
        </div>
      </section>
      <section className="creative-demo">
        <div id="demoArea" ref={demoRef}></div>
        <p>Animated cabinet layout demo (lightweight, no 3D engine).</p>
      </section>
      <footer>
        <p>&copy; 2026 Pimo-Criativo. Crafted for creators.</p>
      </footer>
    </div>
  );
};

export default Concept3Creative;
