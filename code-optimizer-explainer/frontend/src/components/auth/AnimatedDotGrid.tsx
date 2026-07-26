import { useEffect, useRef, memo } from "react";

interface Dot {
  x: number;
  y: number;
  baseOpacity: number;
  opacity: number;
  targetOpacity: number;
  speed: number;
  radius: number;
  pulseOffset: number;
}

const GAP = 28;
const DOT_RADIUS = 1.2;

export const AnimatedDotGrid = memo(function AnimatedDotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const rafRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const buildGrid = () => {
      const cols = Math.ceil(canvas.width / GAP) + 1;
      const rows = Math.ceil(canvas.height / GAP) + 1;
      const dots: Dot[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const base = 0.06 + Math.random() * 0.12;
          dots.push({
            x: c * GAP,
            y: r * GAP,
            baseOpacity: base,
            opacity: base,
            targetOpacity: base,
            speed: 0.003 + Math.random() * 0.005,
            radius: DOT_RADIUS + Math.random() * 0.6,
            pulseOffset: Math.random() * Math.PI * 2,
          });
        }
      }
      dotsRef.current = dots;
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
      buildGrid();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Every ~2s, randomly pick some dots and give them a new target opacity
    const flicker = setInterval(() => {
      dotsRef.current.forEach((dot) => {
        if (Math.random() < 0.08) {
          dot.targetOpacity = 0.03 + Math.random() * 0.35;
        }
      });
    }, 400);

    const render = (timestamp: number) => {
      const dt = timestamp - timeRef.current;
      timeRef.current = timestamp;
      const t = timestamp * 0.001;

      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      dotsRef.current.forEach((dot) => {
        // Lerp toward target
        dot.opacity += (dot.targetOpacity - dot.opacity) * Math.min(dot.speed * dt, 0.08);

        // Gentle sine pulse layered on top
        const pulse = Math.sin(t * 0.8 + dot.pulseOffset) * 0.04;
        const finalOpacity = Math.max(0.02, dot.opacity + pulse);

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${finalOpacity})`;
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(flicker);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none" }}
    />
  );
});
