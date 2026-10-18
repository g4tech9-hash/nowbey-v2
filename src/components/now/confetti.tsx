"use client";

/**
 * Restrained confetti (Master Build Section 12): ~30 particles in brand colours,
 * only fired on report submit, alert activation and hazard confirmation.
 * Disabled entirely under prefers-reduced-motion.
 */
import { useCallback, useEffect, useRef } from "react";

const COLORS = ["#00A3AD", "#00D2D3", "#FFC72C", "#002B49"];

export function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * Math.min(2, window.devicePixelRatio || 1);
      canvas.height = window.innerHeight * Math.min(2, window.devicePixelRatio || 1);
    };
    resize();
    window.addEventListener("resize", resize);

    const fire = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const particles = Array.from({ length: 30 }, () => ({
        x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.3,
        y: canvas.height * 0.35,
        vx: (Math.random() - 0.5) * 8 * dpr,
        vy: (Math.random() - 1.1) * 8 * dpr,
        r: (3 + Math.random() * 4) * dpr,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        spin: Math.random() * Math.PI,
        tilt: (Math.random() - 0.5) * 0.3,
        life: 1,
      }));
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.22 * dpr;
          p.spin += p.tilt;
          p.life = Math.max(0, 1 - elapsed / 1100);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.spin);
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
          ctx.restore();
        }
        if (elapsed < 1150) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      };
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("nbx:confetti", fire);
    return () => {
      window.removeEventListener("nbx:confetti", fire);
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[900] h-full w-full"
    />
  );
}

/** Call `fire()` after a success event. Safe to use in several panels at once. */
export function useConfetti() {
  const fire = useCallback(() => {
    window.dispatchEvent(new Event("nbx:confetti"));
  }, []);
  return fire;
}
