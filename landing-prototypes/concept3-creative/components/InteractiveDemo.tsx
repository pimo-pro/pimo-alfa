import React, { useEffect, useRef, useState } from 'react';

const InteractiveDemo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw playful background
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = 'rgba(31, 41, 55, 0.1)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw animated furniture pieces
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Animated cabinet
      const cabinetX = centerX - 100 + Math.sin(time) * 30;
      const cabinetY = centerY - 60 + Math.cos(time * 0.5) * 20;
      
      // Cabinet body with gradient
      const gradient = ctx.createLinearGradient(cabinetX, cabinetY, cabinetX + 200, cabinetY + 120);
      gradient.addColorStop(0, '#3b82f6');
      gradient.addColorStop(1, '#8b5cf6');
      ctx.fillStyle = gradient;
      ctx.shadowColor = 'rgba(59, 130, 246, 0.3)';
      ctx.shadowBlur = 20;
      ctx.fillRect(cabinetX, cabinetY, 200, 120);
      ctx.shadowBlur = 0;

      // Cabinet doors
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(cabinetX + 20, cabinetY + 20, 70, 80);
      ctx.fillRect(cabinetX + 110, cabinetY + 20, 70, 80);

      // Handles
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(cabinetX + 55, cabinetY + 60, 3, 0, Math.PI * 2);
      ctx.arc(cabinetX + 145, cabinetY + 60, 3, 0, Math.PI * 2);
      ctx.fill();

      // Animated table
      const tableX = centerX - 150 + Math.cos(time * 0.8) * 40;
      const tableY = centerY + 80 + Math.sin(time * 0.6) * 15;
      
      // Table top
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = 'rgba(16, 185, 129, 0.3)';
      ctx.shadowBlur = 15;
      ctx.fillRect(tableX, tableY, 300, 20);
      ctx.shadowBlur = 0;

      // Table legs
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(tableX + 20, tableY + 20, 10, 40);
      ctx.fillRect(tableX + 270, tableY + 20, 10, 40);

      // Floating decorative elements
      for (let i = 0; i < 5; i++) {
        const x = Math.sin(time + i) * 100 + (canvas.width / 3) + (i * 40);
        const y = Math.cos(time * 1.5 + i) * 50 + (canvas.height / 3);
        const size = 10 + Math.sin(time + i) * 5;
        
        ctx.fillStyle = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'][i % 5];
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      time += 0.02;
      animationId = requestAnimationFrame(draw);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const handleCanvasClick = () => {
    // Add a playful interaction effect
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw a burst effect at random position
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    
    ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 50%)`;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
  };

  return (
    <section id="demo" className="interactive-demo">
      <div className="container">
        <div className="demo-header">
          <h2 className="demo-title">Playful Design Playground</h2>
          <p className="demo-subtitle">
            Click anywhere in the demo to add your own creative touch!
          </p>
        </div>
        
        <div className="demo-container">
          <canvas 
            ref={canvasRef} 
            className="demo-canvas"
            onClick={handleCanvasClick}
          ></canvas>
        </div>
        
        <div className="demo-controls">
          <div className="control-item">
            <span className="control-icon">🎨</span>
            <span>Drag & Drop</span>
          </div>
          <div className="control-item">
            <span className="control-icon">🎯</span>
            <span>Smart Snapping</span>
          </div>
          <div className="control-item">
            <span className="control-icon">✨</span>
            <span>Live Preview</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InteractiveDemo;