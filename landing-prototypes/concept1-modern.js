// Lightweight animated cabinet preview
const canvas = document.getElementById('showcaseCanvas');
if (canvas) {
  canvas.width = 320;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');
  let t = 0;
  function draw() {
    ctx.clearRect(0,0,320,120);
    // Draw animated cabinet boxes
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
}