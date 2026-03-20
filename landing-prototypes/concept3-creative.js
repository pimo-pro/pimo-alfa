function showDemo() {
  const demo = document.getElementById('demoArea');
  if (!demo) return;
  demo.innerHTML = '';
  let t = 0;
  function draw() {
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
}