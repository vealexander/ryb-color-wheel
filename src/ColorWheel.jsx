import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";

const RYB_STOPS = [
  { angle: 0, name: "Red", hex: "#E1362D" },
  { angle: 30, name: "Red-Orange", hex: "#E85A2B" },
  { angle: 60, name: "Orange", hex: "#EF8B1D" },
  { angle: 90, name: "Yellow-Orange", hex: "#F4B429" },
  { angle: 120, name: "Yellow", hex: "#F2D33B" },
  { angle: 150, name: "Yellow-Green", hex: "#A8C43D" },
  { angle: 180, name: "Green", hex: "#4B9D5F" },
  { angle: 210, name: "Blue-Green", hex: "#2E9C8F" },
  { angle: 240, name: "Blue", hex: "#2A5C99" },
  { angle: 270, name: "Blue-Violet", hex: "#4F4E9C" },
  { angle: 300, name: "Violet", hex: "#7C4A9E" },
  { angle: 330, name: "Red-Violet", hex: "#B23A72" },
];

const SCHEMES = {
  complementary: {
    label: "Complementary",
    offsets: [0, 180],
    blurb: "Two hues directly across from each other — strongest contrast.",
  },
  analogous: {
    label: "Analogous",
    offsets: [-30, 0, 30],
    blurb: "Three neighboring hues — naturally easy to combine.",
  },
  triadic: {
    label: "Triadic",
    offsets: [0, 120, 240],
    blurb: "Three hues spaced evenly around the wheel — vivid and balanced.",
  },
  splitComplementary: {
    label: "Split-Complementary",
    offsets: [0, 150, 210],
    blurb: "A hue plus the two neighbors of its opposite — contrast, less tension.",
  },
  square: {
    label: "Square",
    offsets: [0, 90, 180, 270],
    blurb: "Four hues at even quarters — rich; lead with one dominant color.",
  },
  rectangle: {
    label: "Rectangle",
    offsets: [0, 60, 180, 240],
    blurb: "Two complementary pairs — flexible; use one hue as the lead.",
  },
  monochromatic: {
    label: "Monochromatic",
    offsets: [0],
    blurb: "One hue carried from full strength down toward white.",
  },
};

const DISC_R = 39;
const TICK_R = 47;

function normalizeAngle(a) {
  return ((a % 360) + 360) % 360;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(rgb) {
  return (
    "#" +
    rgb
      .map((v) =>
        Math.round(Math.max(0, Math.min(255, v)))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
      .toUpperCase()
  );
}

function lerpColor(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex([
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]);
}

function hueAtAngle(angle) {
  const a = normalizeAngle(angle);
  const idx = Math.floor(a / 30) % 12;
  const next = (idx + 1) % 12;
  const t = (a - idx * 30) / 30;
  return lerpColor(RYB_STOPS[idx].hex, RYB_STOPS[next].hex, t);
}

function colorAt(angle, radiusFraction) {
  const hue = hueAtAngle(angle);
  return lerpColor("#FFFFFF", hue, radiusFraction);
}

function nearestStopName(angle) {
  const a = normalizeAngle(angle);
  let best = RYB_STOPS[0];
  let bestDist = 999;
  for (const s of RYB_STOPS) {
    let d = Math.abs(a - s.angle);
    d = Math.min(d, 360 - d);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best.name;
}

function tickAbbr(name) {
  return name
    .split("-")
    .map((w) => w[0])
    .join("-");
}

function point(localAngleDeg, radiusPct) {
  const rad = (localAngleDeg * Math.PI) / 180;
  return {
    x: 50 + radiusPct * Math.sin(rad),
    y: 50 - radiusPct * Math.cos(rad),
  };
}

export default function ColorWheel() {
  const [schemeKey, setSchemeKey] = useState("complementary");
  const [baseAngle, setBaseAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const wheelRef = useRef(null);
  const copyTimeoutRef = useRef(null);

  const scheme = SCHEMES[schemeKey];

  useEffect(() => {
    return () => window.clearTimeout(copyTimeoutRef.current);
  }, []);

  const markers = useMemo(() => {
    if (schemeKey === "monochromatic") {
      const radii = [1, 0.75, 0.5, 0.25];
      return radii.map((rf, i) => ({
        id: `m${i}`,
        offset: 0,
        radiusFraction: rf,
        isPrimary: rf === 1,
        color: colorAt(baseAngle, rf),
        label: rf === 1 ? "Pure hue" : `${Math.round(rf * 100)}%`,
      }));
    }
    return scheme.offsets.map((o, i) => {
      const angle = normalizeAngle(baseAngle + o);
      return {
        id: `m${i}`,
        offset: o,
        radiusFraction: 1,
        isPrimary: o === 0,
        color: colorAt(angle, 1),
        label: nearestStopName(angle),
      };
    });
  }, [schemeKey, baseAngle, scheme]);

  const angleFromEvent = useCallback((e) => {
    const rect = wheelRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    return normalizeAngle((Math.atan2(dx, -dy) * 180) / Math.PI);
  }, []);

  const handlePointerDown = (e) => {
    e.preventDefault();
    try {
      wheelRef.current.setPointerCapture(e.pointerId);
    } catch (err) {
      /* ignore */
    }
    setIsDragging(true);
    setBaseAngle(angleFromEvent(e));
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    setBaseAngle(angleFromEvent(e));
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    try {
      wheelRef.current.releasePointerCapture(e.pointerId);
    } catch (err) {
      /* ignore */
    }
  };

  const handleWheelKeyDown = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setBaseAngle((a) => normalizeAngle(a + (e.shiftKey ? 15 : 1)));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setBaseAngle((a) => normalizeAngle(a - (e.shiftKey ? 15 : 1)));
    }
  };

  const fallbackCopy = (text, cb) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      cb();
    } catch (err) {
      /* ignore */
    }
  };

  const copyHex = (hex, id) => {
    const done = () => {
      setCopiedId(id);
      window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = window.setTimeout(() => setCopiedId(null), 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(hex).then(done).catch(() => fallbackCopy(hex, done));
    } else {
      fallbackCopy(hex, done);
    }
  };

  const conicStops = RYB_STOPS.map((s) => `${s.hex} ${s.angle}deg`).join(", ");
  const conicGradient = `conic-gradient(from 0deg, ${conicStops}, ${RYB_STOPS[0].hex} 360deg)`;

  const polygonPoints =
    schemeKey !== "monochromatic"
      ? scheme.offsets
          .map((o) => {
            const p = point(o, DISC_R);
            return `${p.x},${p.y}`;
          })
          .join(" ")
      : "";

  const monoLineEnd = point(0, DISC_R);

  return (
    <div className="cw-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

        .cw-root, .cw-root *{ box-sizing:border-box; }
        .cw-root{
          --ink:#0c0b09;
          --panel:#151310;
          --cream:#E8DFC8;
          --muted:#8f8672;
          --amber:#C98A3E;
          --amber-soft: rgba(201,138,62,0.35);
          --hairline:#2a2620;
          position:relative;
          background:var(--ink);
          color:var(--cream);
          font-family:'IBM Plex Mono', ui-monospace, monospace;
          padding:28px 18px 32px;
          max-width:440px;
          margin:0 auto;
          border-radius:4px;
          overflow:hidden;
          -webkit-font-smoothing:antialiased;
        }
        .cw-grain{
          position:absolute; inset:0;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity:0.05;
          mix-blend-mode:overlay;
          pointer-events:none;
        }
        .cw-content{ position:relative; z-index:1; }
        .cw-eyebrow{
          font-size:10.5px; letter-spacing:0.18em; text-transform:uppercase;
          color:var(--amber); margin:0 0 8px;
        }
        .cw-title{
          font-family:'Fraunces', serif; font-weight:600;
          font-size:28px; line-height:1.1; margin:0 0 8px; color:var(--cream);
        }
        .cw-subtitle{
          font-size:12px; line-height:1.55; color:var(--muted); margin:0 0 22px; max-width:38ch;
        }
        .cw-schemes{
          display:grid; grid-template-columns:repeat(2,1fr); gap:8px; margin-bottom:14px;
        }
        .cw-scheme-btn{
          font-family:inherit; font-size:11px; letter-spacing:0.02em;
          padding:9px 10px; border-radius:3px;
          background:transparent; border:1px solid var(--hairline); color:var(--muted);
          cursor:pointer; text-align:left; transition:border-color .15s, color .15s, background .15s;
        }
        .cw-scheme-btn:hover{ border-color:var(--amber-soft); color:var(--cream); }
        .cw-scheme-btn:focus-visible{ outline:2px solid var(--amber); outline-offset:1px; }
        .cw-scheme-btn.active{
          background:var(--amber); border-color:var(--amber); color:var(--ink); font-weight:600;
        }
        .cw-blurb{
          font-size:11.5px; color:var(--muted); min-height:32px; margin:0 0 6px; line-height:1.5;
        }
        .cw-readout{
          display:flex; justify-content:space-between; align-items:baseline;
          font-size:11px; color:var(--amber); border-top:1px solid var(--hairline);
          border-bottom:1px solid var(--hairline); padding:7px 2px; margin-bottom:22px;
          letter-spacing:0.03em;
        }
        .cw-readout b{ color:var(--cream); font-weight:600; }
        .cw-wheel-wrap{
          position:relative; width:min(78vw,300px); aspect-ratio:1/1; margin:0 auto 20px;
          touch-action:none; -webkit-user-select:none; user-select:none; cursor:grab;
        }
        .cw-wheel-wrap:active{ cursor:grabbing; }
        .cw-wheel-wrap:focus-visible{ outline:2px solid var(--amber); outline-offset:6px; border-radius:50%; }
        .cw-tick{
          position:absolute; transform:translate(-50%,-50%);
          font-size:8px; color:var(--muted); letter-spacing:0.02em;
          pointer-events:none; white-space:nowrap;
        }
        .cw-marker-dot{
          border-radius:50%; border:2px solid var(--ink);
          box-shadow:0 0 0 1.5px rgba(232,223,200,0.85), 0 1px 4px rgba(0,0,0,0.5);
        }
        .cw-slider-row{
          display:flex; align-items:center; gap:10px; margin-bottom:26px;
        }
        .cw-slider-row label{ font-size:10.5px; color:var(--muted); letter-spacing:0.06em; text-transform:uppercase; flex-shrink:0; }
        .cw-slider-row input[type=range]{
          flex:1; appearance:none; -webkit-appearance:none; height:2px; background:var(--hairline); border-radius:2px; outline:none;
        }
        .cw-slider-row input[type=range]::-webkit-slider-thumb{
          -webkit-appearance:none; appearance:none; width:14px; height:14px; border-radius:50%;
          background:var(--amber); cursor:pointer; border:2px solid var(--ink);
        }
        .cw-slider-row input[type=range]::-moz-range-thumb{
          width:14px; height:14px; border-radius:50%; background:var(--amber); cursor:pointer; border:2px solid var(--ink);
        }
        .cw-slider-row input[type=range]:focus-visible{ outline:2px solid var(--amber); outline-offset:3px; }
        .cw-slider-val{ font-size:11px; color:var(--cream); width:34px; text-align:right; flex-shrink:0; }
        .cw-swatches{
          display:grid; grid-template-columns:repeat(2,1fr); gap:9px;
        }
        .cw-swatch{
          position:relative; display:flex; align-items:center; gap:9px;
          background:var(--panel); border:1px solid var(--hairline); border-radius:3px;
          padding:8px; font-family:inherit; color:var(--cream); cursor:pointer; text-align:left;
          transition:border-color .15s;
        }
        .cw-swatch:hover{ border-color:var(--amber-soft); }
        .cw-swatch:focus-visible{ outline:2px solid var(--amber); outline-offset:1px; }
        .cw-chip{ width:32px; height:32px; border-radius:3px; flex-shrink:0; border:1px solid rgba(255,255,255,0.15); }
        .cw-swatch-text{ min-width:0; }
        .cw-hex{ font-size:11.5px; font-weight:600; display:block; }
        .cw-hue-name{ font-size:10px; color:var(--muted); display:block; margin-top:1px; }
        .cw-copied{
          position:absolute; top:5px; right:6px; font-size:8.5px; letter-spacing:0.05em;
          color:var(--amber); text-transform:uppercase;
        }
        .cw-sr-only{
          position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden;
          clip:rect(0,0,0,0); white-space:nowrap; border:0;
        }
      `}</style>

      <div className="cw-grain" />

      <div className="cw-content">
        <p className="cw-eyebrow">Traditional Pigment Wheel</p>
        <h2 className="cw-title">RYB Color Wheel</h2>
        <p className="cw-subtitle">
          The red-yellow-blue wheel artists have used since Itten. Pick a harmony, then drag the wheel — or use the slider — to rotate it.
        </p>

        <div className="cw-schemes">
          {Object.entries(SCHEMES).map(([key, s]) => (
            <button
              key={key}
              type="button"
              className={`cw-scheme-btn${key === schemeKey ? " active" : ""}`}
              onClick={() => setSchemeKey(key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <p className="cw-blurb">{scheme.blurb}</p>

        <div className="cw-readout">
          <span>{scheme.label}</span>
          <span>
            <b>{String(Math.round(baseAngle)).padStart(3, "0")}°</b>
          </span>
        </div>

        <div
          ref={wheelRef}
          className="cw-wheel-wrap"
          role="slider"
          aria-label="Rotate color harmony around the wheel"
          aria-valuemin={0}
          aria-valuemax={359}
          aria-valuenow={Math.round(baseAngle)}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleWheelKeyDown}
        >
          <div
            style={{
              position: "absolute",
              inset: "11%",
              borderRadius: "50%",
              background: conicGradient,
              boxShadow: "0 0 0 1px rgba(232,223,200,0.12), 0 10px 30px rgba(0,0,0,0.5)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "11%",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--amber)",
              transform: "translate(-50%,-50%)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `rotate(${baseAngle}deg)`,
              transition: isDragging ? "none" : "transform 300ms cubic-bezier(.2,.8,.2,1)",
              transformOrigin: "50% 50%",
              pointerEvents: "none",
            }}
          >
            <svg
              viewBox="0 0 100 100"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
            >
              {schemeKey === "monochromatic" ? (
                <line
                  x1={50}
                  y1={50}
                  x2={monoLineEnd.x}
                  y2={monoLineEnd.y}
                  stroke="#C98A3E"
                  strokeWidth={0.7}
                  strokeOpacity={0.7}
                />
              ) : (
                <polygon
                  points={polygonPoints}
                  fill="rgba(201,138,62,0.08)"
                  stroke="#C98A3E"
                  strokeWidth={0.6}
                  strokeOpacity={0.85}
                  strokeLinejoin="round"
                />
              )}
            </svg>

            {markers.map((m) => {
              const localAngle = schemeKey === "monochromatic" ? 0 : m.offset;
              const r = DISC_R * m.radiusFraction;
              const p = point(localAngle, r);
              const size = m.isPrimary ? 20 : 15;
              return (
                <div
                  key={m.id}
                  style={{
                    position: "absolute",
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    transform: "translate(-50%,-50%)",
                  }}
                >
                  <div className="cw-marker-dot" style={{ width: size, height: size, background: m.color }} />
                </div>
              );
            })}
          </div>

          {RYB_STOPS.map((s) => {
            const p = point(s.angle, TICK_R);
            return (
              <span key={s.angle} className="cw-tick" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                {tickAbbr(s.name)}
              </span>
            );
          })}
        </div>

        <div className="cw-slider-row">
          <label htmlFor="cw-rotate">Rotate</label>
          <input
            id="cw-rotate"
            type="range"
            min={0}
            max={359}
            value={Math.round(baseAngle)}
            onChange={(e) => setBaseAngle(Number(e.target.value))}
          />
          <span className="cw-slider-val">{String(Math.round(baseAngle)).padStart(3, "0")}°</span>
        </div>

        <div className="cw-swatches">
          {markers.map((m) => (
            <button
              key={m.id}
              type="button"
              className="cw-swatch"
              onClick={() => copyHex(m.color, m.id)}
              aria-label={`Copy ${m.color}`}
            >
              <span className="cw-chip" style={{ background: m.color }} />
              <span className="cw-swatch-text">
                <span className="cw-hex">{m.color}</span>
                <span className="cw-hue-name">{m.label}</span>
              </span>
              {copiedId === m.id && <span className="cw-copied">Copied</span>}
            </button>
          ))}
        </div>

        <span className="cw-sr-only" aria-live="polite">
          {scheme.label} harmony at {Math.round(baseAngle)} degrees
        </span>
      </div>
    </div>
  );
}
