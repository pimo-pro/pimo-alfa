import React, { useEffect, useRef } from 'react';

const Hero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const shapes = container.querySelectorAll('.creative-shape');
    let animationId: number;
    let time = 0;

    const animate = () => {
      time += 0.02;
      
      shapes.forEach((shape, index) => {
        const element = shape as HTMLElement;
        const delay = index * 0.2;
        const progress = (time + delay) % 4;
        
        // Create playful bouncing and rotating animations
        const x = Math.sin(time * 2 + index) * 30;
        const y = Math.cos(time * 1.5 + index * 0.5) * 20;
        const rotation = time * 50 + index * 30;
        const scale = 1 + Math.sin(time + index) * 0.2;
        
        element.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`;
        element.style.opacity = String(0.6 + Math.abs(Math.sin(time + index * 0.3)) * 0.4);
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Unleash Your <span className="highlight">Creativity</span>
            </h1>
            <p className="hero-subtitle">
              Playful, powerful furniture design tools that make creating beautiful 
              spaces fun and intuitive.
            </p>
            <div className="hero-actions">
              <button className="btn-primary">Start Creating</button>
              <button className="btn-secondary">Explore Gallery</button>
            </div>
          </div>
          
          <div className="hero-visual" ref={containerRef}>
            <div className="creative-demo">
              <div className="creative-shape shape-1"></div>
              <div className="creative-shape shape-2"></div>
              <div className="creative-shape shape-3"></div>
              <div className="creative-shape shape-4"></div>
              <div className="creative-shape shape-5"></div>
              <div className="creative-shape shape-6"></div>
              <div className="creative-shape shape-7"></div>
              <div className="creative-shape shape-8"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;