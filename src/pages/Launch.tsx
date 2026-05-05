import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const TOTAL_SECONDS = 30;

const BOOT_MESSAGES = [
  { at: 1,  text: "INITIALIZING NEURAL CORE" },
  { at: 5,  text: "LOADING TEACHER DATABASE.............. OK" },
  { at: 9,  text: "CONNECTING CLASSROOM MODULES.......... OK" },
  { at: 13, text: "SYNCING ACADEMIC RECORDS.............. OK" },
  { at: 17, text: "ENGAGING AI CONSULTANT (พีท ร่างทอง).. OK" },
  { at: 21, text: "CALIBRATING EXAM GENERATOR............ OK" },
  { at: 25, text: "RUNNING SECURITY PROTOCOLS............ OK" },
  { at: 28, text: "ALL SYSTEMS NOMINAL................... ✓" },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Matrix rain canvas
function useMatrixRain(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const cols = Math.floor(canvas.width / 16);
    const drops: number[] = Array(cols).fill(1);

    const draw = () => {
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = "13px monospace";
      for (let i = 0; i < drops.length; i++) {
        const bright = Math.random() > 0.9;
        ctx.fillStyle = bright ? "#afffaf" : "#00ff41";
        ctx.globalAlpha = 0.15 + Math.random() * 0.5;
        const char = String.fromCharCode(0x30a0 + Math.random() * 96);
        ctx.fillText(char, i * 16, drops[i] * 16);
        ctx.globalAlpha = 1;
        if (drops[i] * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };

    const id = setInterval(draw, 40);
    return () => {
      clearInterval(id);
      window.removeEventListener("resize", resize);
    };
  }, []);
}

// AI Face SVG — radar scanner
function AIFace({ seconds, online }: { seconds: number; online: boolean }) {
  const elapsed = TOTAL_SECONDS - seconds;
  const scanDeg = (elapsed / TOTAL_SECONDS) * 360 * 3; // 3 full rotations
  const sweepRad = (scanDeg % 360) * (Math.PI / 180);

  const eyeGlow = online ? "#00ff41" : seconds < 10 ? "#ffff00" : "#00cc33";
  const eyePulse = online || seconds < 5;

  // Scan line endpoint
  const R = 82;
  const sx = 100 + R * Math.cos(sweepRad - Math.PI / 2);
  const sy = 100 + R * Math.sin(sweepRad - Math.PI / 2);

  // Tick marks
  const ticks = Array.from({ length: 24 }, (_, i) => {
    const a = (i * 15 - 90) * (Math.PI / 180);
    const r1 = i % 2 === 0 ? 88 : 85;
    return {
      x1: 100 + r1 * Math.cos(a),
      y1: 100 + r1 * Math.sin(a),
      x2: 100 + 92 * Math.cos(a),
      y2: 100 + 92 * Math.sin(a),
      major: i % 6 === 0,
    };
  });

  return (
    <svg width="220" height="220" viewBox="0 0 200 200" className="drop-shadow-[0_0_24px_#00ff41]">
      {/* Defs: gradient, glow */}
      <defs>
        <radialGradient id="faceGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#001a00" />
          <stop offset="100%" stopColor="#000800" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Sweep gradient */}
        <radialGradient id="sweepGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00ff41" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#00ff41" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer decorative rings */}
      <circle cx="100" cy="100" r="95" fill="none" stroke="#003300" strokeWidth="0.5" strokeDasharray="2 6" />
      <circle cx="100" cy="100" r="92" fill="none" stroke="#004400" strokeWidth="0.3" />

      {/* Tick marks */}
      {ticks.map((t, i) => (
        <line
          key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke="#00ff41" strokeWidth={t.major ? 1.5 : 0.7} opacity={t.major ? 0.6 : 0.3}
        />
      ))}

      {/* Scan sweep (radar fan) */}
      {!online && (
        <path
          d={`M100,100 L${sx},${sy} A82,82 0 0,0 ${100 + R * Math.cos(sweepRad - Math.PI / 2 - 0.8)},${100 + R * Math.sin(sweepRad - Math.PI / 2 - 0.8)} Z`}
          fill="#00ff41" opacity="0.08"
        />
      )}

      {/* Middle ring */}
      <circle cx="100" cy="100" r="82" fill="none" stroke="#005500" strokeWidth="0.8" />

      {/* Face base */}
      <circle cx="100" cy="100" r="58" fill="url(#faceGrad)" stroke="#00ff41" strokeWidth="1.5" filter="url(#glow)" />

      {/* Inner cross-hairs */}
      <line x1="100" y1="42" x2="100" y2="55" stroke="#00ff41" strokeWidth="0.6" opacity="0.4" />
      <line x1="100" y1="145" x2="100" y2="158" stroke="#00ff41" strokeWidth="0.6" opacity="0.4" />
      <line x1="42" y1="100" x2="55" y2="100" stroke="#00ff41" strokeWidth="0.6" opacity="0.4" />
      <line x1="145" y1="100" x2="158" y2="100" stroke="#00ff41" strokeWidth="0.6" opacity="0.4" />

      {/* Eyes */}
      <ellipse cx="82" cy="92" rx="9" ry="6" fill={eyeGlow} opacity="0.15" />
      <ellipse cx="118" cy="92" rx="9" ry="6" fill={eyeGlow} opacity="0.15" />
      <ellipse cx="82" cy="92" rx="7" ry="4.5" fill="none" stroke={eyeGlow} strokeWidth="1.2" filter="url(#glow)" />
      <ellipse cx="118" cy="92" rx="7" ry="4.5" fill="none" stroke={eyeGlow} strokeWidth="1.2" filter="url(#glow)" />
      {/* Pupils */}
      <ellipse cx="82" cy="92" rx="3" ry="3" fill={eyeGlow} opacity={eyePulse ? 0.9 : 0.6} filter="url(#glow)" />
      <ellipse cx="118" cy="92" rx="3" ry="3" fill={eyeGlow} opacity={eyePulse ? 0.9 : 0.6} filter="url(#glow)" />

      {/* Nose bridge — circuit line */}
      <line x1="100" y1="96" x2="100" y2="106" stroke="#005500" strokeWidth="1" />
      <circle cx="100" cy="107" r="1.5" fill="#00aa00" />

      {/* Mouth — progress bar */}
      <rect x="76" y="115" width="48" height="5" rx="2.5" fill="#002200" />
      <rect
        x="76" y="115"
        width={online ? 48 : Math.max(2, 48 * (elapsed / TOTAL_SECONDS))}
        height="5" rx="2.5"
        fill={eyeGlow}
        filter="url(#glow)"
      />

      {/* Ear circuit lines */}
      <line x1="42" y1="88" x2="55" y2="88" stroke="#005500" strokeWidth="0.8" />
      <line x1="42" y1="112" x2="55" y2="112" stroke="#005500" strokeWidth="0.8" />
      <line x1="145" y1="88" x2="158" y2="88" stroke="#005500" strokeWidth="0.8" />
      <line x1="145" y1="112" x2="158" y2="112" stroke="#005500" strokeWidth="0.8" />

      {/* Scan line (radar sweep) */}
      {!online && (
        <line
          x1="100" y1="100" x2={sx} y2={sy}
          stroke="#00ff41" strokeWidth="1" opacity="0.7"
          filter="url(#glow)"
        />
      )}

      {/* ONLINE checkmark */}
      {online && (
        <text x="100" y="104" textAnchor="middle" fill="#00ff41" fontSize="20" fontFamily="monospace" filter="url(#glow)">
          ✓
        </text>
      )}
    </svg>
  );
}

export default function Launch() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [seconds, setSeconds] = useState(TOTAL_SECONDS);
  const [messages, setMessages] = useState<string[]>([]);
  const [online, setOnline] = useState(false);
  const [glitch, setGlitch] = useState(false);
  const [blink, setBlink] = useState(true);

  useMatrixRain(canvasRef);

  // Countdown
  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(id);
          setGlitch(true);
          setTimeout(() => {
            setGlitch(false);
            setOnline(true);
          }, 600);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Boot messages — schedule by elapsed time
  useEffect(() => {
    const timers = BOOT_MESSAGES.map(({ at, text }) =>
      setTimeout(() => setMessages((m) => [...m, text]), at * 1000)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Cursor blink
  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(id);
  }, []);

  const elapsed = TOTAL_SECONDS - seconds;
  const progress = (elapsed / TOTAL_SECONDS) * 100;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="relative min-h-screen bg-black overflow-hidden flex flex-col items-center justify-center select-none">
      {/* Matrix rain */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ opacity: 0.25 }} />

      {/* Scan line overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,255,65,0.015) 3px, rgba(0,255,65,0.015) 4px)",
        }}
      />

      {/* Glitch overlay */}
      {glitch && (
        <div className="absolute inset-0 z-50 pointer-events-none animate-pulse"
          style={{ background: "rgba(0,255,65,0.08)", mixBlendMode: "screen" }} />
      )}

      <div
        className="relative z-10 flex flex-col items-center gap-6 px-6 max-w-lg w-full font-mono"
        style={{ filter: glitch ? "hue-rotate(120deg) brightness(2)" : undefined, transition: "filter 0.1s" }}
      >
        {/* System header */}
        <div className="text-center space-y-0.5">
          <p className="text-green-600 text-xs tracking-[0.25em] uppercase">
            ATLAS SYSTEM v2.0
          </p>
          <p className="text-green-900 text-[10px] tracking-[0.15em]">
            ADAPTIVE TEACHING & LEARNING ANALYTICS
          </p>
        </div>

        {/* AI Face */}
        <div className={online ? "animate-pulse" : ""}>
          <AIFace seconds={seconds} online={online} />
        </div>

        {online ? (
          /* ─── ONLINE STATE ─── */
          <div className="text-center space-y-4 w-full">
            <p
              className="text-green-400 text-3xl font-bold tracking-[0.2em] animate-pulse"
              style={{ textShadow: "0 0 20px #00ff41, 0 0 40px #00ff41" }}
            >
              ▶ ATLAS ONLINE ◀
            </p>
            <p className="text-green-600 text-xs tracking-widest">ALL SYSTEMS OPERATIONAL</p>
            <button
              onClick={() => navigate("/login")}
              className="mt-2 px-10 py-3 border border-green-400 text-green-400 text-lg tracking-[0.2em] hover:bg-green-400 hover:text-black transition-all duration-300 w-full"
              style={{ boxShadow: "0 0 16px #00ff41, inset 0 0 16px rgba(0,255,65,0.05)" }}
            >
              [ ENTER ATLAS ]
            </button>
          </div>
        ) : (
          /* ─── COUNTDOWN STATE ─── */
          <div className="text-center space-y-4 w-full">
            <p className="text-green-700 text-[10px] tracking-[0.3em] uppercase">
              SYSTEM GOES LIVE IN
            </p>

            {/* Big timer */}
            <p
              className="text-green-400 font-bold tabular-nums leading-none"
              style={{
                fontSize: "4.5rem",
                textShadow: "0 0 20px #00ff41, 0 0 50px #00ff41",
                letterSpacing: "0.15em",
              }}
            >
              {pad(mins)} : {pad(secs)}
            </p>

            {/* Progress bar */}
            <div className="w-full h-px bg-green-900 relative overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-green-400 transition-all duration-1000"
                style={{ width: `${progress}%`, boxShadow: "0 0 8px #00ff41" }}
              />
            </div>

            {/* Boot log */}
            <div className="text-left w-full space-y-0.5 min-h-[120px]">
              {messages.map((msg, i) => (
                <p key={i} className="text-green-600 text-[11px] leading-5">
                  <span className="text-green-800">&gt;&nbsp;</span>
                  {msg}
                </p>
              ))}
              {messages.length < BOOT_MESSAGES.length && (
                <p className="text-green-500 text-[11px] leading-5">
                  <span className="text-green-800">&gt;&nbsp;</span>
                  {blink ? "█" : " "}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-green-900 text-[9px] tracking-[0.3em] mt-4">
          © ATLAS SYSTEM — AUTHORIZED PERSONNEL ONLY
        </p>
      </div>
    </div>
  );
}
