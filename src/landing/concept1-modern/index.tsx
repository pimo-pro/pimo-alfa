import React, { useEffect, useRef } from 'react';
import './styles.css';

const Concept1Modern: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 320;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    let t = 0;
    let running = true;
    function draw() {
      if (!running) return;
      ctx.clearRect(0,0,320,120);
      for (let i = 0; i < 3; i++) {
        const x = 40 + i * 90 + Math.sin(t + i) * 8;
        const y = 40 + Math.cos(t + i) * 6;
        ctx.fillStyle = ['#4f8cff','#ffb347','#a3e635'][i];
        ctx.fillRect(x, y, 60, 40);
        ctx.strokeStyle = '#222';
        ctx.strokeRect(x, y, 60, 40);
      }
      t += 0.03;
      requestAnimationFrame(draw);
    }
    draw();
    return () => { running = false; };
  }, []);

  return (
    <div className="concept1-modern-root">
      <header className="hero">
        <h1>Pimo-Criativo</h1>
        <p>Revolutionizing Furniture Design with Interactive 3D Visualization</p>
        <a href="#features" className="cta">Explore Features</a>
      </header>
      <section id="features" className="features">
        <div className="feature-card">
          <h2>Cabinet Configurator</h2>
          <p>Design modular cabinets with millimeter precision and instant visual feedback.</p>
        </div>
        <div className="feature-card">
          <h2>Material Library</h2>
          <p>Choose from a rich library of textures and finishes, optimized for manufacturing.</p>
        </div>
        <div className="feature-card">
          <h2>Cutlist & Export</h2>
          <p>Generate cutlists, PDFs, and CNC files for seamless production workflow.</p>
        </div>
      </section>
      <section className="animated-showcase">
        <h2>Visual Showcase</h2>
        <canvas ref={canvasRef} id="showcaseCanvas"></canvas>
        <p>Lightweight animated preview of cabinet modules.</p>
      </section>
      <footer>
        <p>&copy; 2026 Pimo-Criativo. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Concept1Modern;
