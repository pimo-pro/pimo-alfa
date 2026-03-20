import React, { useEffect, useRef } from 'react';

const WorkflowDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const shapes = container.querySelectorAll('.workflow-shape');
    let animationId: number;
    let time = 0;

    const animate = () => {
      time += 0.02;
      
      shapes.forEach((shape, index) => {
        const element = shape as HTMLElement;
        const delay = index * 0.5;
        const progress = (time + delay) % 3;
        
        // Move shapes in a wave pattern
        const x = Math.sin(time + index * 0.5) * 20;
        const y = Math.cos(time * 2 + index * 0.3) * 10;
        
        element.style.transform = `translate(${x}px, ${y}px)`;
        element.style.opacity = String(0.3 + Math.abs(Math.sin(time + index * 0.2)) * 0.7);
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <section id="demo" className="workflow-demo">
      <div className="container">
        <div className="demo-header">
          <h2 className="demo-title">Design Workflow</h2>
          <p className="demo-subtitle">
            See how simple and intuitive furniture design can be.
          </p>
        </div>
        
        <div className="demo-container" ref={containerRef}>
          <div className="workflow-step">
            <div className="step-number">1</div>
            <div className="step-title">Plan</div>
            <div className="step-description">Layout your space</div>
            <div className="workflow-shape shape-1"></div>
          </div>
          
          <div className="workflow-step">
            <div className="step-number">2</div>
            <div className="step-title">Design</div>
            <div className="step-description">Create your furniture</div>
            <div className="workflow-shape shape-2"></div>
          </div>
          
          <div className="workflow-step">
            <div className="step-number">3</div>
            <div className="step-title">Refine</div>
            <div className="step-description">Add details & materials</div>
            <div className="workflow-shape shape-3"></div>
          </div>
          
          <div className="workflow-step">
            <div className="step-number">4</div>
            <div className="step-title">Export</div>
            <div className="step-description">Generate production files</div>
            <div className="workflow-shape shape-4"></div>
          </div>
        </div>
        
        <div className="demo-benefits">
          <div className="benefit-item">
            <span className="benefit-icon">⚡</span>
            <span>Fast workflow</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">🎯</span>
            <span>Precise measurements</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">🔄</span>
            <span>Iterative design</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkflowDemo;