import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain } from "lucide-react";

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

        {/* Brain icon — with animated rings */}
        <div className="relative flex items-center justify-center my-2">
          {/* Outermost slow-spin ring */}
          <div
            className="absolute rounded-full border border-green-900"
            style={{
              width: 220, height: 220,
              borderStyle: "dashed",
              animation: "spin 12s linear infinite",
            }}
          />
          {/* Middle counter-spin ring */}
          <div
            className="absolute rounded-full border border-green-800"
            style={{
              width: 180, height: 180,
              borderStyle: "dashed",
              animation: "spin 7s linear infinite reverse",
              opacity: 0.6,
            }}
          />
          {/* Inner ring */}
          <div
            className="absolute rounded-full border border-green-700"
            style={{ width: 148, height: 148, opacity: 0.4 }}
          />

          {/* Brain circle container */}
          <div
            className="relative flex items-center justify-center rounded-full bg-black border border-green-500"
            style={{
              width: 120, height: 120,
              boxShadow: online
                ? "0 0 60px #00ff41, 0 0 120px rgba(0,255,65,0.4), inset 0 0 30px rgba(0,255,65,0.1)"
                : "0 0 30px #00ff41, 0 0 60px rgba(0,255,65,0.2), inset 0 0 20px rgba(0,255,65,0.05)",
            }}
          >
            <Brain
              style={{
                width: 56, height: 56,
                color: online ? "#00ff41" : "#00cc33",
                filter: "drop-shadow(0 0 10px #00ff41) drop-shadow(0 0 20px rgba(0,255,65,0.5))",
              }}
            />
          </div>

          {/* Tick marks on outer ring */}
          <svg className="absolute" width={220} height={220} viewBox="0 0 220 220" style={{ pointerEvents: "none" }}>
            {Array.from({ length: 16 }, (_, i) => {
              const a = (i * 22.5 - 90) * (Math.PI / 180);
              const r1 = 104, r2 = 110;
              return (
                <line key={i}
                  x1={110 + r1 * Math.cos(a)} y1={110 + r1 * Math.sin(a)}
                  x2={110 + r2 * Math.cos(a)} y2={110 + r2 * Math.sin(a)}
                  stroke="#00ff41" strokeWidth={i % 4 === 0 ? 2 : 0.8} opacity={i % 4 === 0 ? 0.7 : 0.3}
                />
              );
            })}
          </svg>
        </div>

        {/* ATLAS Intelligence label */}
        <div className="text-center -mt-1">
          <p
            className="text-green-400 text-xl font-bold tracking-[0.3em]"
            style={{ textShadow: "0 0 12px #00ff41" }}
          >
            ATLAS
          </p>
          <p className="text-green-700 text-[10px] tracking-[0.25em]">Intelligence</p>
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
