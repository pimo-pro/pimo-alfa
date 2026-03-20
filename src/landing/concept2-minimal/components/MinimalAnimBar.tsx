import React, { useEffect, useRef } from 'react';

const MinimalAnimBar: React.FC = () => {
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

  return <div className="minimal-animation" ref={animRef}></div>;
};

export default MinimalAnimBar;
