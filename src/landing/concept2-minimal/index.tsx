import React, { useEffect, useRef } from 'react';
import './styles.css';

const Concept2Minimal: React.FC = () => {
  const animRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anim = animRef.current;
    if (!anim) return;
    let t = 0;
    let running = true;
    function draw() {
      if (!running) return;
      anim.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const box = document.createElement('div');
        box.style.position = 'absolute';
        box.style.left = `${10 + i * 35 + Math.sin(t + i) * 6}px`;
        box.style.top = `${10 + Math.cos(t + i) * 4}px`;
        box.style.width = '24px';
        box.style.height = '24px';
        box.style.background = ['#4f8cff','#ffb347','#a3e635'][i];
        box.style.borderRadius = '6px';
        anim.appendChild(box);
      }
      t += 0.04;
      requestAnimationFrame(draw);
    }
    draw();
    return () => { running = false; };
  }, []);

  return (
    <div className="concept2-minimal-root">
      <nav className="nav-bar">
        <span className="logo">Pimo-Criativo</span>
        <a href="#about">About</a>
        <a href="#services">Services</a>
        <a href="#contact">Contact</a>
      </nav>
      <main>
        <section id="about" className="about">
          <h1>Furniture Design, Simplified</h1>
          <p>Pimo-Criativo empowers designers and makers with intuitive tools for cabinet creation and manufacturing.</p>
        </section>
        <section id="services" className="services">
          <ul>
            <li>Parametric Cabinet Design</li>
            <li>Material Selection & Visualization</li>
            <li>Automated Cutlist Generation</li>
          </ul>
          <div className="minimal-animation" ref={animRef}></div>
        </section>
        <section id="contact" className="contact">
          <form>
            <input type="email" placeholder="Your email" required />
            <button type="submit">Get Updates</button>
          </form>
        </section>
      </main>
      <footer>
        <small>&copy; 2026 Pimo-Criativo</small>
      </footer>
    </div>
  );
};

export default Concept2Minimal;
