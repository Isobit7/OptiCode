import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Rocket, Sparkles, Code, Github } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Inline WebGL liquid-chrome so z-index is never an issue ──────────────────
const VERT = `
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAG = `
  precision highp float;
  uniform vec2  u_resolution;
  uniform float u_time;
  uniform vec2  u_mouse;
  uniform float u_amplitude;

  const mat2 m = mat2(0.80, 0.60, -0.60, 0.80);
  float hash(vec2 p){ float h = dot(p, vec2(127.1, 311.7)); return fract(sin(h)*43758.5453123); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p), u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
  }
  float fbm(vec2 p){
    float f=0.0;
    f+=0.5000*noise(p); p=m*p*2.02;
    f+=0.2500*noise(p); p=m*p*2.03;
    f+=0.1250*noise(p); p=m*p*2.01;
    f+=0.0625*noise(p);
    return f/0.9375;
  }
  void main(){
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 p  = -1.0 + 2.0*uv;
    if(u_resolution.y>0.0) p.x *= u_resolution.x/u_resolution.y;
    vec2 mouse = (u_mouse-0.5)*2.0;
    if(u_resolution.y>0.0) mouse.x *= u_resolution.x/u_resolution.y;
    vec2 diff = p-mouse;
    float dist = length(diff);
    if(dist>0.0) p += (diff/dist)*exp(-dist*3.0)*0.1;
    float t = u_time*0.5;
    vec2 q = vec2(fbm(p+t*0.1), fbm(p+vec2(5.2,1.3)+t*0.15));
    vec2 r = vec2(fbm(p+4.0*q+vec2(1.7,9.2)+t*0.2), fbm(p+4.0*q+vec2(8.3,2.8)+t*0.25));
    float f = fbm(p+r*4.0*u_amplitude);
    vec3 base = vec3(0.09, 0.09, 0.14);
    vec3 col  = mix(base, vec3(0.0), 1.0-smoothstep(0.1,0.3,f));
    col = mix(col, vec3(0.8,0.8,0.9), smoothstep(0.4,0.6,f));
    col = mix(col, vec3(1.0),         smoothstep(0.6,0.8,f));
    float v = 16.0*uv.x*uv.y*(1.0-uv.x)*(1.0-uv.y);
    col *= 0.5+0.5*pow(max(0.0,v),0.2);
    gl_FragColor = vec4(col,1.0);
  }
`;

function LiquidBg({ paused }: { paused: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const mouse = useRef<[number, number]>([0.5, 0.5]);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s); return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, "position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uRes  = gl.getUniformLocation(prog, "u_resolution");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uMouse= gl.getUniformLocation(prog, "u_mouse");
    const uAmp  = gl.getUniformLocation(prog, "u_amplitude");

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouse = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.current = [(e.clientX-r.left)/r.width, 1-(e.clientY-r.top)/r.height];
    };
    window.addEventListener("mousemove", onMouse);

    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (pausedRef.current) return;
      const t = (now - start) * 0.001 * 0.9;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uMouse, mouse.current[0], mouse.current[1]);
      gl.uniform1f(uAmp, 0.65);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    />
  );
}

const REDUCED = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const noTransition: React.CSSProperties = { transition: "none", color: "inherit" };

export function HeroPreviewPage() {
  const [reduced, setReduced] = useState(REDUCED);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cb = () => setReduced(mq.matches);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        height: "100dvh",
        width: "100%",
        overflow: "hidden",
        background: "#0e0e14",
        fontFamily: "'Satoshi', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* ── WebGL background ── */}
      <LiquidBg paused={reduced} />

      {/* ── Colour overlays on top of canvas ── */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at top, rgba(249,115,22,0.18) 0%, transparent 60%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.38)",
        pointerEvents: "none",
      }} />

      {/* ── Back link ── */}
      <Link
        to="/login"
        style={{
          position: "fixed", top: 16, left: 16, zIndex: 50,
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 6,
          background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 500,
          textDecoration: "none", backdropFilter: "blur(8px)",
          transition: "color 0.2s, background 0.2s",
        }}
      >
        <ArrowLeft style={{ width: 14, height: 14 }} />
        Get Started
      </Link>

      {/* ── Main content ── */}
      <main style={{
        position: "relative", zIndex: 10,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        height: "100%", padding: "0 24px", textAlign: "center",
        maxWidth: 1152, margin: "0 auto",
      }}>
        {/* Badge */}
        <span style={{
          ...noTransition,
          display: "inline-flex", alignItems: "center", gap: 6,
          marginBottom: 20, padding: "4px 12px",
          borderRadius: 9999, border: "1px solid rgba(255,255,255,0.15)",
          background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)",
          fontSize: 11, fontWeight: 500, letterSpacing: "0.05em",
          color: "rgba(255,255,255,0.85)",
        }}>
          <Sparkles style={{ width: 12, height: 12, color: "#f97316", flexShrink: 0 }} />
          Liquid Chrome · WebGL Fragment Shader
        </span>

        {/* Headline */}
        <h1 style={{
          ...noTransition,
          margin: 0,
          fontSize: "clamp(2.5rem, 9vw, 6.5rem)",
          lineHeight: 0.95,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "#ffffff",
          maxWidth: 900,
        }}>
          Understand any code.
          <br />
          Ship{" "}
          <span style={{ color: "#f97316", transition: "none" }}>
            cleaner versions
          </span>
          .
        </h1>

        {/* Sub-headline */}
        <p style={{
          ...noTransition,
          marginTop: 28,
          maxWidth: 640,
          fontSize: "clamp(1rem, 1.8vw, 1.125rem)",
          lineHeight: 1.65,
          color: "rgba(255,255,255,0.82)",
        }}>
          Paste any snippet. Get plain-language explanations, humanized formatting,
          security audits, visual flowcharts, or alternative implementations — powered by AI.
        </p>

        {/* CTA buttons */}
        <div style={{ marginTop: 36, display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          <Link to="/login">
            <Button
              size="lg"
              className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-lg shadow-orange-500/25 border-0 hover:from-orange-600 hover:to-amber-600 hover:text-white"
            >
              <Rocket className="h-4 w-4 text-white" />
              <span className="text-white font-bold">Get Started</span>
            </Button>
          </Link>
          <a href="https://github.com/Isobit7/OptiCode" target="_blank" rel="noreferrer">
            <Button
              size="lg"
              variant="outline"
              className="gap-2 border-white/20 bg-white/5 text-white/90 backdrop-blur hover:bg-white/10 hover:text-white"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </Button>
          </a>
        </div>

        {/* Feature tags */}
        <div style={{
          marginTop: 44,
          display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center",
        }}>
          {[
            { icon: <Code style={{ width: 12, height: 12, color: "#f97316", flexShrink: 0 }} />, text: "10 AI Actions · Explain, Humanize, Security, Translate, PR Review, Flowchart, Prettify, Shorten, SEO, Alternatives" },
            { icon: <Sparkles style={{ width: 12, height: 12, color: "#818cf8", flexShrink: 0 }} />, text: "TanStack Start SSR · Radix Primitives · Tailwind v4" },
          ].map(({ icon, text }) => (
            <span key={text} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 10px", borderRadius: 9999,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)",
              fontSize: 11, color: "rgba(255,255,255,0.75)",
            }}>
              {icon}{text}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}
