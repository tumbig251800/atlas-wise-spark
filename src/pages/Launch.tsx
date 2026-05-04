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

// AI Face SVG — futuristic robot head
function AIFace({ seconds, online }: { seconds: number; online: boolean }) {
  const elapsed = TOTAL_SECONDS - seconds;
  const p = elapsed / TOTAL_SECONDS; // 0→1

  const eyeColor = online ? "#00ff41" : seconds < 8 ? "#aaff00" : "#00ff41";
  const scanX = (w: number) => Math.max(3, w * p);

  return (
    <svg width="260" height="310" viewBox="0 0 260 310" className="drop-shadow-[0_0_32px_#00ff41]">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow2">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="headGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#001800" />
          <stop offset="100%" stopColor="#000a00" />
        </linearGradient>
        <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#003300" />
          <stop offset="100%" stopColor={eyeColor} />
        </linearGradient>
        <clipPath id="eyeL"><rect x="62" y="108" width="54" height="18" rx="3" /></clipPath>
        <clipPath id="eyeR"><rect x="144" y="108" width="54" height="18" rx="3" /></clipPath>
      </defs>

      {/* ── OUTER HALO ── */}
      <ellipse cx="130" cy="138" rx="118" ry="132" fill="none" stroke="#00ff41" strokeWidth="0.4" opacity="0.2" strokeDasharray="4 8" />
      <ellipse cx="130" cy="138" rx="112" ry="126" fill="none" stroke="#00ff41" strokeWidth="0.3" opacity="0.15" />

      {/* ── HEAD SILHOUETTE ── */}
      {/* Main head shape — angular geometric */}
      <path
        d="M80,22 L50,50 L42,90 L42,175 L55,215 L78,248 L108,265 L130,270 L152,265 L182,248 L205,215 L218,175 L218,90 L210,50 L180,22 Z"
        fill="url(#headGrad)"
        stroke="#00ff41"
        strokeWidth="1.5"
        filter="url(#glow)"
      />

      {/* ── FOREHEAD CHIP / NEURAL PANEL ── */}
      <rect x="90" y="28" width="80" height="28" rx="4" fill="rgba(0,30,0,0.85)" stroke="#005500" strokeWidth="1" />
      {/* Chip loading bar */}
      <rect x="94" y="32" width={scanX(72)} height="8" rx="2" fill="#00ff41" opacity="0.35" />
      {/* Chip dots */}
      {[102, 116, 130, 144, 158].map((x, i) => (
        <circle key={i} cx={x} cy="48" r="2.5"
          fill={elapsed > i * 5 ? eyeColor : "#002200"}
          filter={elapsed > i * 5 ? "url(#glow)" : undefined}
        />
      ))}

      {/* ── TEMPLE LINES (left) ── */}
      {[95, 115, 135, 155, 175].map((y, i) => (
        <line key={i} x1="42" y1={y} x2={58 + (i % 2) * 4} y2={y}
          stroke="#00ff41" strokeWidth="0.7" opacity="0.4" />
      ))}
      {/* ── TEMPLE LINES (right) ── */}
      {[95, 115, 135, 155, 175].map((y, i) => (
        <line key={i} x1={202 - (i % 2) * 4} y1={y} x2="218" y2={y}
          stroke="#00ff41" strokeWidth="0.7" opacity="0.4" />
      ))}

      {/* ── EAR PANELS ── */}
      <rect x="30" y="110" width="14" height="50" rx="3" fill="rgba(0,20,0,0.9)" stroke="#004400" strokeWidth="1" />
      <rect x="33" y="114" width="6" height="6" rx="1" fill={p > 0.3 ? eyeColor : "#002200"} opacity="0.8" />
      <rect x="33" y="124" width="6" height="4" rx="1" fill={p > 0.6 ? eyeColor : "#002200"} opacity="0.6" />
      <rect x="216" y="110" width="14" height="50" rx="3" fill="rgba(0,20,0,0.9)" stroke="#004400" strokeWidth="1" />
      <rect x="221" y="114" width="6" height="6" rx="1" fill={p > 0.3 ? eyeColor : "#002200"} opacity="0.8" />
      <rect x="221" y="124" width="6" height="4" rx="1" fill={p > 0.6 ? eyeColor : "#002200"} opacity="0.6" />

      {/* ── LEFT EYE — scanner bar ── */}
      <rect x="62" y="108" width="54" height="18" rx="3" fill="rgba(0,8,0,0.95)" stroke={eyeColor} strokeWidth="1.2" filter="url(#glow)" />
      <rect x="64" y="110" width={scanX(50)} height="14" rx="2" fill={`url(#eyeGrad)`} clipPath="url(#eyeL)" />
      {!online && <rect x={64 + scanX(50) - 2} y="110" width="3" height="14" fill="white" opacity="0.7" clipPath="url(#eyeL)" />}
      {/* Eye glow overlay */}
      <rect x="62" y="108" width="54" height="18" rx="3" fill={eyeColor} opacity="0.06" />

      {/* ── RIGHT EYE — scanner bar ── */}
      <rect x="144" y="108" width="54" height="18" rx="3" fill="rgba(0,8,0,0.95)" stroke={eyeColor} strokeWidth="1.2" filter="url(#glow)" />
      <rect x="146" y="110" width={scanX(50)} height="14" rx="2" fill={`url(#eyeGrad)`} clipPath="url(#eyeR)" />
      {!online && <rect x={146 + scanX(50) - 2} y="110" width="3" height="14" fill="white" opacity="0.7" clipPath="url(#eyeR)" />}
      <rect x="144" y="108" width="54" height="18" rx="3" fill={eyeColor} opacity="0.06" />

      {/* ── NOSE BRIDGE ── */}
      <rect x="124" y="132" width="12" height="32" rx="5" fill="rgba(0,25,0,0.6)" stroke="#003300" strokeWidth="0.8" />
      <circle cx="130" cy="166" r="3" fill="#00aa00" opacity="0.5" />

      {/* ── CHEEK CIRCUITS ── */}
      <line x1="62" y1="145" x2="78" y2="145" stroke="#005500" strokeWidth="1" />
      <line x1="78" y1="145" x2="78" y2="158" stroke="#005500" strokeWidth="1" />
      <circle cx="78" cy="158" r="2" fill={p > 0.4 ? "#00ff41" : "#002200"} />
      <line x1="198" y1="145" x2="182" y2="145" stroke="#005500" strokeWidth="1" />
      <line x1="182" y1="145" x2="182" y2="158" stroke="#005500" strokeWidth="1" />
      <circle cx="182" cy="158" r="2" fill={p > 0.4 ? "#00ff41" : "#002200"} />

      {/* ── MOUTH — data bar ── */}
      <rect x="84" y="182" width="92" height="22" rx="4" fill="rgba(0,12,0,0.9)" stroke="#004400" strokeWidth="1" />
      <rect x="87" y="185" width={scanX(86)} height="8" rx="2" fill={eyeColor} opacity="0.55" />
      <rect x="87" y="196" width={scanX(60)} height="5" rx="2" fill="#00aa00" opacity="0.35" />

      {/* ── CHIN DETAILS ── */}
      <line x1="100" y1="210" x2="130" y2="210" stroke="#004400" strokeWidth="1" />
      <line x1="130" y1="210" x2="160" y2="210" stroke="#004400" strokeWidth="1" />
      <circle cx="130" cy="210" r="3" fill={p > 0.7 ? eyeColor : "#002200"} />
      <line x1="110" y1="225" x2="130" y2="235" stroke="#003300" strokeWidth="0.8" />
      <line x1="150" y1="225" x2="130" y2="235" stroke="#003300" strokeWidth="0.8" />

      {/* ── CIRCUIT TRACES OUTSIDE HEAD ── */}
      <polyline points="42,100 18,88 10,88" fill="none" stroke="#003300" strokeWidth="0.8" />
      <circle cx="10" cy="88" r="2" fill={p > 0.2 ? "#00ff41" : "#002200"} opacity="0.7" />
      <polyline points="42,170 18,182 10,182" fill="none" stroke="#003300" strokeWidth="0.8" />
      <circle cx="10" cy="182" r="2" fill={p > 0.5 ? "#00ff41" : "#002200"} opacity="0.7" />
      <polyline points="218,100 242,88 250,88" fill="none" stroke="#003300" strokeWidth="0.8" />
      <circle cx="250" cy="88" r="2" fill={p > 0.2 ? "#00ff41" : "#002200"} opacity="0.7" />
      <polyline points="218,170 242,182 250,182" fill="none" stroke="#003300" strokeWidth="0.8" />
      <circle cx="250" cy="182" r="2" fill={p > 0.5 ? "#00ff41" : "#002200"} opacity="0.7" />

      {/* ── ONLINE ✓ overlay ── */}
      {online && (
        <text x="130" y="168" textAnchor="middle" fill="#00ff41" fontSize="36"
          fontFamily="monospace" filter="url(#glow2)">✓</text>
      )}

      {/* ── ATLAS Intelligence LABEL ── */}
      <text x="130" y="292" textAnchor="middle" fill="#00ff41" fontSize="18"
        fontFamily="monospace" fontWeight="bold" letterSpacing="4" filter="url(#glow)">
        ATLAS
      </text>
      <text x="130" y="308" textAnchor="middle" fill="#00bb33" fontSize="10"
        fontFamily="monospace" letterSpacing="3">
        Intelligence
      </text>
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
