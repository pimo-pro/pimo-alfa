import React, { useEffect, useRef } from 'react';

const VisualDemo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

      // Draw grid background
      ctx.strokeStyle = 'rgba(79, 140, 255, 0.1)';
      ctx.lineWidth = 1;
      const gridSize = 20;
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

      // Draw animated cabinet
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const cabinetWidth = 200 + Math.sin(time) * 20;
      const cabinetHeight = 120 + Math.cos(time) * 10;

      // Cabinet body
      ctx.fillStyle = '#2563eb';
      ctx.shadowColor = 'rgba(37, 99, 235, 0.3)';
      ctx.shadowBlur = 20;
      ctx.fillRect(centerX - cabinetWidth / 2, centerY - cabinetHeight / 2, cabinetWidth, cabinetHeight);

      // Cabinet details
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(centerX - cabinetWidth / 2 + 10, centerY - cabinetHeight / 2 + 10, cabinetWidth - 20, 30);
      
      // Doors
      const doorWidth = (cabinetWidth - 30) / 2;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(centerX - cabinetWidth / 2 + 15, centerY - cabinetHeight / 2 + 50, doorWidth, cabinetHeight - 60);
      ctx.fillRect(centerX - cabinetWidth / 2 + 15 + doorWidth + 10, centerY - cabinetHeight / 2 + 50, doorWidth, cabinetHeight - 60);

      // Handles
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(centerX - 25, centerY, 3, 0, Math.PI * 2);
      ctx.arc(centerX + 25, centerY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Animated measurement lines
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      const measurementY = centerY + cabinetHeight / 2 + 20;
      
      ctx.beginPath();
      ctx.moveTo(centerX - cabinetWidth / 2, measurementY);
      ctx.lineTo(centerX + cabinetWidth / 2, measurementY);
      ctx.stroke();

      // Measurement text
      ctx.fillStyle = '#ef4444';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(cabinetWidth)}mm`, centerX, measurementY - 5);

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

  return (
    <section className="visual-demo">
      <div className="container">
        <h2 className="demo-title">Interactive Design Preview</h2>
        <p className="demo-subtitle">
          Experience our smart snapping system and real-time measurement tools in action
        </p>
        <div className="demo-container">
          <canvas ref={canvasRef} className="demo-canvas"></canvas>
        </div>
        <div className="demo-features">
          <div className="feature-item">
            <span className="feature-icon">📐</span>
            <span>Real-time measurements</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎯</span>
            <span>Smart snapping system</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <span>Instant visual feedback</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VisualDemo;