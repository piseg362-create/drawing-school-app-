import React from "react";

/* ------------------------------------------------------------------
   Wheel: simple spoked wheel, spins continuously.
------------------------------------------------------------------- */
function WheelGroup() {
  return (
    <g style={{ transformOrigin: "0px 0px", animation: "cl-spin 0.4s linear infinite" }}>
      <circle r="24" fill="#151515" />
      <circle r="24" fill="none" stroke="#333" strokeWidth="2" />
      <circle r="12" fill="#c9c9c9" />
      <line x1="0" y1="-12" x2="0" y2="12" stroke="#777" strokeWidth="2" />
      <line x1="-12" y1="0" x2="12" y2="0" stroke="#777" strokeWidth="2" />
      <circle r="3" fill="#555" />
    </g>
  );
}

/* ------------------------------------------------------------------
   CarBody — simple, unmistakably car-shaped silhouette.
   viewBox is 300 x 160; wheels sit at (80,120) and (220,120);
   front of the car (headlight) faces right, rear (tailpipe) faces left.
------------------------------------------------------------------- */
function CarBody({ className = "", style }) {
  return (
    <svg viewBox="0 0 300 160" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      {/* ground shadow */}
      <ellipse cx="150" cy="138" rx="130" ry="8" fill="rgba(0,0,0,0.22)" />

      {/* wheel-well black backdrops */}
      <circle cx="80" cy="120" r="26" fill="#111" />
      <circle cx="220" cy="120" r="26" fill="#111" />

      {/* body */}
      <path
        d="
          M 30 118
          L 30 100
          C 30 92 36 86 44 86
          L 70 86
          L 95 55
          C 100 49 108 46 116 46
          L 190 46
          C 198 46 205 49 210 55
          L 232 82
          L 262 86
          C 270 87 276 93 276 101
          L 276 118
          Z
        "
        fill="#c1552c"
        stroke="#8f3d1e"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* windows */}
      <path d="M 100 82 L 118 56 C 121 52 126 50 131 50 L 148 50 L 148 82 Z" fill="#161a2e" />
      <path d="M 154 82 L 154 50 L 186 50 C 191 50 196 52 199 56 L 216 82 Z" fill="#161a2e" />
      <rect x="150" y="50" width="4" height="32" fill="#8f3d1e" />

      {/* door seam */}
      <line x1="180" y1="86" x2="180" y2="118" stroke="#8f3d1e" strokeWidth="2" opacity="0.6" />

      {/* bumpers */}
      <rect x="30" y="100" width="12" height="18" rx="3" fill="#eee7dc" />
      <rect x="264" y="100" width="12" height="18" rx="3" fill="#eee7dc" />

      {/* lights: headlight (front, right) / taillight (rear, left) */}
      <circle cx="268" cy="96" r="4" fill="#f4d58d" />
      <circle cx="38" cy="96" r="4" fill="#e0574a" />

      {/* door handle */}
      <rect x="164" y="76" width="10" height="4" rx="2" fill="#eee7dc" />

      {/* wheel arches */}
      <path d="M 54 118 A 26 26 0 0 1 106 118" fill="none" stroke="#eee7dc" strokeWidth="3" opacity="0.7" />
      <path d="M 194 118 A 26 26 0 0 1 246 118" fill="none" stroke="#eee7dc" strokeWidth="3" opacity="0.7" />

      {/* wheels */}
      <g transform="translate(80,120)">
        <WheelGroup />
      </g>
      <g transform="translate(220,120)">
        <WheelGroup />
      </g>
    </svg>
  );
}

const CAR_ASPECT = 300 / 160; // width / height of the CarBody artwork

/* ------------------------------------------------------------------
   1) CarLoader — fixed-size hero "drive-by" loading banner, with
      exhaust smoke and trailing dust.
------------------------------------------------------------------- */
export function CarLoader({ label = "Loading", width = 480, height = 224 }) {
  const roadH = height * 0.2;
  const carH = height * 0.5;
  const carW = carH * CAR_ASPECT;

  return (
    <div style={{ width, height }}>
      <style>{keyframes}</style>
      <div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#2c3242] via-[#232734] to-[#171a22]"
        style={{ width, height }}
      >
        {/* sky glow */}
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_80%_20%,#f2b077_0%,transparent_55%)]" />

        {/* road */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-[#20232a] border-t-2 border-[#3a3d45]"
          style={{ height: roadH }}
        >
          <div className="cl-lane-strip absolute top-1/2 -translate-y-1/2 left-0 h-1.5 w-[220%] flex gap-10">
            {Array.from({ length: 24 }).map((_, i) => (
              <span key={i} className="h-1.5 w-12 rounded-full bg-[#cfd3da]/70 shrink-0" />
            ))}
          </div>
        </div>

        {/* car rig: drives left-to-right, bobs on suspension */}
        <div
          className="cl-drive absolute left-0"
          style={{
            bottom: roadH - carH * 0.08,
            "--car-w": `${carW}px`,
            "--drive-distance": `${width}px`,
          }}
        >
          <div className="cl-bob relative" style={{ width: carW, height: carH }}>
            <CarBody className="absolute inset-0 w-full h-full" />

            {/* exhaust / carbon-emission smoke, trailing off the rear (left) */}
            <span className="cl-smoke cl-smoke-1 absolute rounded-full bg-black/35" />
            <span className="cl-smoke cl-smoke-2 absolute rounded-full bg-black/28" />
            <span className="cl-smoke cl-smoke-3 absolute rounded-full bg-black/20" />

            {/* dust kicked up at each wheel, drifting backward */}
            <span className="cl-dust cl-dust-front-1 absolute rounded-full bg-[#cbb89a]/70" />
            <span className="cl-dust cl-dust-front-2 absolute rounded-full bg-[#cbb89a]/50" />
            <span className="cl-dust cl-dust-rear-1 absolute rounded-full bg-[#cbb89a]/70" />
            <span className="cl-dust cl-dust-rear-2 absolute rounded-full bg-[#cbb89a]/50" />
          </div>
        </div>

        {/* label */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[#f2e9de] text-sm font-medium tracking-wide">
          {label}
          <span className="cl-dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   2) CarLoaderCompact — fixed-size inline spinner (buttons, rows)
------------------------------------------------------------------- */
export function CarLoaderCompact({ size = 96 }) {
  const carH = size / CAR_ASPECT;
  return (
    <div className="relative inline-block" style={{ width: size, height: carH }}>
      <style>{keyframes}</style>
      <div className="cl-idle-bob relative w-full h-full">
        <CarBody className="absolute inset-0 w-full h-full" />
        <span className="cl-smoke cl-smoke-1 absolute rounded-full bg-black/35" />
        <span className="cl-smoke cl-smoke-2 absolute rounded-full bg-black/25" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Keyframes (shared)
------------------------------------------------------------------- */
const keyframes = `
@keyframes cl-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes cl-drive {
  0%   { transform: translateX(calc(-1 * var(--car-w, 220px))); }
  100% { transform: translateX(var(--drive-distance, 100vw)); }
}
@keyframes cl-bob {
  0%, 100% { transform: translateY(0px); }
  50%      { transform: translateY(-3px); }
}
@keyframes cl-idle-bob {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50%      { transform: translateY(-2px) rotate(-0.6deg); }
}
@keyframes cl-lane-move {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes cl-dots {
  0%, 20%  { opacity: 0; }
  50%      { opacity: 1; }
  100%     { opacity: 0; }
}

/* smoke: puffs up and back from the tailpipe (rear/left), growing and fading */
@keyframes cl-smoke {
  0%   { transform: translate(0,0) scale(0.3); opacity: 0.55; }
  100% { transform: translate(-46px,-30px) scale(1.6); opacity: 0; }
}

/* dust: kicked up near the wheels, drifting backward (left) along the ground, fading */
@keyframes cl-dust {
  0%   { transform: translate(0,0) scale(0.4); opacity: 0.6; }
  100% { transform: translate(-40px,4px) scale(1.3); opacity: 0; }
}

.cl-drive { animation: cl-drive 3.6s linear infinite; }
.cl-bob { animation: cl-bob 0.35s ease-in-out infinite; }
.cl-idle-bob { animation: cl-idle-bob 1.1s ease-in-out infinite; }
.cl-lane-strip { animation: cl-lane-move 0.5s linear infinite; }

.cl-smoke {
  width: 10px;
  height: 10px;
  left: 6%;
  bottom: 34%;
}
.cl-smoke-1 { animation: cl-smoke 1s ease-out infinite; }
.cl-smoke-2 { animation: cl-smoke 1s ease-out infinite 0.33s; }
.cl-smoke-3 { animation: cl-smoke 1s ease-out infinite 0.66s; }

.cl-dust { width: 8px; height: 5px; bottom: 2%; }
.cl-dust-front-1 { left: 26%; animation: cl-dust 0.8s ease-out infinite; }
.cl-dust-front-2 { left: 26%; animation: cl-dust 0.8s ease-out infinite 0.4s; }
.cl-dust-rear-1 { left: 73%; animation: cl-dust 0.8s ease-out infinite 0.15s; }
.cl-dust-rear-2 { left: 73%; animation: cl-dust 0.8s ease-out infinite 0.55s; }

.cl-dots span { display: inline-block; opacity: 0; animation: cl-dots 1.2s infinite; }
.cl-dots span:nth-child(1) { animation-delay: 0s; }
.cl-dots span:nth-child(2) { animation-delay: 0.2s; }
.cl-dots span:nth-child(3) { animation-delay: 0.4s; }
`;

/* ------------------------------------------------------------------
   Demo (default export) — shows both variants at fixed sizes
------------------------------------------------------------------- */
/* ------------------------------------------------------------------
   Demo (default export) — scales all loaders based on size parameter
------------------------------------------------------------------- */
export default function CarLoaderDemo({ sizeMultiplier = 1 , label }) {
  return (
    <div className="w-full flex flex-col items-center justify-center p-4">
      <CarLoader 
        label={label}
        width={480 * sizeMultiplier} 
        height={224 * sizeMultiplier} 
      />
    </div>
  );
}