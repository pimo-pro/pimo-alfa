import React, { useEffect, useRef } from 'react';

const CabinetShowcase: React.FC = () => {
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

  return <canvas ref={canvasRef} />;
};

export default CabinetShowcase;
