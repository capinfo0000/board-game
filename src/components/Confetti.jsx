import React, { useEffect, useRef } from 'react';

// 勝利演出：canvas に紙吹雪を降らせる（依存ライブラリなし）
export default function Confetti({ duration = 6000 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let raf;
    let running = true;
    const colors = ['#ffcf5c', '#5cc8ff', '#ff6b6b', '#6bdca0', '#c08bff', '#ffffff'];

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const N = 160;
    const pieces = Array.from({ length: N }, () => spawn(canvas));

    function spawn(c) {
      return {
        x: Math.random() * c.width,
        y: Math.random() * -c.height,
        w: 6 + Math.random() * 8,
        h: 8 + Math.random() * 10,
        color: colors[(Math.random() * colors.length) | 0],
        vx: -1.5 + Math.random() * 3,
        vy: 2 + Math.random() * 3.5,
        rot: Math.random() * Math.PI,
        vr: -0.2 + Math.random() * 0.4,
        sway: Math.random() * Math.PI * 2,
      };
    }

    const start = performance.now();
    function frame(now) {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const elapsed = now - start;
      const fading = elapsed > duration;
      for (const p of pieces) {
        p.sway += 0.05;
        p.x += p.vx + Math.sin(p.sway) * 0.8;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > canvas.height + 20) {
          if (!fading) {
            Object.assign(p, spawn(canvas), { y: -20 });
          }
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [duration]);

  return <canvas ref={canvasRef} className="confetti-canvas" aria-hidden />;
}
