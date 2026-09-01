import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";

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
    blurb:
      "A hue plus the two neighbors of its opposite — contrast, less tension.",
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
          .padStart(2, "0"),
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
      navigator.clipboard
        .writeText(hex)
        .then(done)
        .catch(() => fallbackCopy(hex, done));
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
        /* Material 3 + Apple Liquid Glass Design System */
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500&display=swap');

        /* ========== GLOBAL & RESET ========== */
        .cw-root, .cw-root * { box-sizing: border-box; }
        
        /* ========== MATERIAL 3 & GLASS DESIGN TOKENS ========== */
        .cw-root {
          /* Dark Theme Surface Colors (Material 3) */
          --surface-darkest: #0f0e0b;
          --surface-dark: #1a1815;
          --surface-base: #232019;
          --surface-light: #2d2a26;
          --surface-lighter: #3a3632;
          
          /* Material 3 Color System - Primary (Vibrant Teal/Cyan for dark mode sophistication) */
          --primary: #4dd0e1;
          --on-primary: #001f23;
          --primary-container: #005961;
          --on-primary-container: #b2f7ff;
          
          /* Secondary (Muted Purple-Gray) */
          --secondary: #9a8fb8;
          --on-secondary: #2b2845;
          --secondary-container: #423c5f;
          --on-secondary-container: #ffc4e1;
          
          /* Tertiary (Warm Peach accent) */
          --tertiary: #f4aa6a;
          --on-tertiary: #4d2500;
          --tertiary-container: #6d3f1d;
          --on-tertiary-container: #ffe0c1;
          
          /* Semantic Colors */
          --error: #f2b8b5;
          --on-error: #601410;
          --warning: #f4aa6a;
          --success: #81c784;
          
          /* Surface Overlays & Text */
          --on-surface: #ece1d7;
          --on-surface-variant: #9b918a;
          
          /* Glass Effect Tokens */
          --glass-blur-intense: 30px;
          --glass-blur-medium: 20px;
          --glass-blur-subtle: 10px;
          --glass-opacity-max: 0.85;
          --glass-opacity-medium: 0.75;
          --glass-opacity-subtle: 0.65;
          
          /* Elevation Shadows (Material 3) */
          --shadow-0: none;
          --shadow-1: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
          --shadow-2: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);
          --shadow-3: 0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23);
          --shadow-4: 0 15px 25px rgba(0, 0, 0, 0.15), 0 5px 10px rgba(0, 0, 0, 0.05);
          --shadow-5: 0 20px 40px rgba(0, 0, 0, 0.2);
          
          /* State Layers (Material 3 interaction feedback) */
          --state-layer-hover: rgba(77, 208, 225, 0.08);
          --state-layer-focus: rgba(77, 208, 225, 0.12);
          --state-layer-pressed: rgba(77, 208, 225, 0.12);
          --state-layer-disabled: rgba(236, 225, 215, 0.12);
          
          /* Root Container */
          position: relative;
          background: var(--surface-darkest);
          color: var(--on-surface);
          font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          padding: 24px 20px 28px;
          max-width: 480px;
          margin: 0 auto;
          border-radius: 28px;
          overflow: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* ========== SURFACES & GLASS EFFECTS ========== */
        .cw-grain {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity: 0.02;
          mix-blend-mode: overlay;
          pointer-events: none;
        }

        .cw-content {
          position: relative;
          z-index: 1;
        }

        /* ========== TYPOGRAPHY SCALE (Material 3) ========== */
        .cw-eyebrow {
          font-family: 'Poppins', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--primary);
          margin: 0 0 8px;
          line-height: 1.5;
        }

        .cw-title {
          font-family: 'Poppins', sans-serif;
          font-size: 32px;
          font-weight: 600;
          line-height: 1.2;
          letter-spacing: -0.5px;
          margin: 0 0 8px;
          color: var(--on-surface);
        }

        .cw-subtitle {
          font-family: 'Roboto', sans-serif;
          font-size: 14px;
          font-weight: 400;
          line-height: 1.57;
          color: var(--on-surface-variant);
          margin: 0 0 20px;
          max-width: 42ch;
        }

        /* ========== SCHEME BUTTONS (Material 3 filled tonal buttons) ========== */
        .cw-schemes {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 12px;
        }

        .cw-scheme-btn {
          font-family: inherit;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.01em;
          padding: 10px 16px;
          border-radius: 10px;
          background: var(--surface-light);
          border: none;
          color: var(--on-surface-variant);
          cursor: pointer;
          text-align: left;
          transition: all 150ms cubic-bezier(0.2, 0.8, 0.2, 1);
          backdrop-filter: blur(var(--glass-blur-subtle));
          position: relative;
          overflow: hidden;
        }

        .cw-scheme-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--state-layer-hover);
          opacity: 0;
          transition: opacity 150ms;
        }

        .cw-scheme-btn:hover::before {
          opacity: 1;
        }

        .cw-scheme-btn:hover {
          color: var(--on-surface);
          border-color: transparent;
        }

        .cw-scheme-btn:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        .cw-scheme-btn.active {
          background: var(--primary);
          color: var(--on-primary);
          font-weight: 600;
          box-shadow: var(--shadow-1);
        }

        .cw-scheme-btn.active::before {
          display: none;
        }

        /* ========== BLURB & METADATA ========== */
        .cw-blurb {
          font-size: 13px;
          font-weight: 400;
          color: var(--on-surface-variant);
          min-height: 32px;
          margin: 0 0 12px;
          line-height: 1.5;
        }

        .cw-readout {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: 12px;
          font-weight: 500;
          color: var(--on-surface-variant);
          background: rgba(77, 208, 225, 0.08);
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 20px;
          letter-spacing: 0.03em;
          backdrop-filter: blur(var(--glass-blur-subtle));
          border: 1px solid rgba(77, 208, 225, 0.1);
        }

        .cw-readout b {
          color: var(--primary);
          font-weight: 600;
        }

        /* ========== COLOR WHEEL (NO VISUAL CHANGES) ========== */
        .cw-wheel-wrap {
          position: relative;
          width: min(78vw, 300px);
          aspect-ratio: 1 / 1;
          margin: 0 auto 24px;
          touch-action: none;
          -webkit-user-select: none;
          user-select: none;
          cursor: grab;
          border-radius: 50%;
        }

        .cw-wheel-wrap:active {
          cursor: grabbing;
        }

        .cw-wheel-wrap:focus-visible {
          outline: 3px solid var(--primary);
          outline-offset: 6px;
          border-radius: 50%;
        }

        .cw-tick {
          position: absolute;
          transform: translate(-50%, -50%);
          font-size: 9px;
          font-weight: 500;
          color: var(--on-surface-variant);
          letter-spacing: 0.02em;
          pointer-events: none;
          white-space: nowrap;
        }

        .cw-marker-dot {
          border-radius: 50%;
          border: 2.5px solid var(--surface-darkest);
          box-shadow: 0 0 0 1.5px rgba(77, 208, 225, 0.8), var(--shadow-2);
          transition: transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .cw-marker-dot:active {
          transform: scale(1.15);
        }

        /* ========== SLIDER CONTROLS ========== */
        .cw-slider-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 24px;
          background: rgba(77, 208, 225, 0.04);
          padding: 12px 14px;
          border-radius: 12px;
          backdrop-filter: blur(var(--glass-blur-subtle));
          border: 1px solid rgba(77, 208, 225, 0.08);
        }

        .cw-slider-row label {
          font-size: 11px;
          font-weight: 600;
          color: var(--on-surface-variant);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        .cw-slider-row input[type="range"] {
          flex: 1;
          appearance: none;
          -webkit-appearance: none;
          height: 4px;
          background: linear-gradient(to right, var(--surface-light), var(--primary));
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }

        .cw-slider-row input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          border: 2px solid var(--surface-darkest);
          box-shadow: var(--shadow-2);
          transition: all 120ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .cw-slider-row input[type="range"]::-webkit-slider-thumb:hover {
          box-shadow: var(--shadow-3);
          transform: scale(1.2);
        }

        .cw-slider-row input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          border: 2px solid var(--surface-darkest);
          box-shadow: var(--shadow-2);
          transition: all 120ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .cw-slider-row input[type="range"]::-moz-range-thumb:hover {
          box-shadow: var(--shadow-3);
          transform: scale(1.2);
        }

        .cw-slider-row input[type="range"]:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 3px;
        }

        .cw-slider-val {
          font-size: 12px;
          font-weight: 600;
          color: var(--primary);
          width: 40px;
          text-align: right;
          flex-shrink: 0;
        }

        /* ========== COLOR SWATCHES (Material 3 glass cards) ========== */
        .cw-swatches {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .cw-swatch {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(45, 42, 38, 0.6);
          backdrop-filter: blur(var(--glass-blur-medium));
          border: 1px solid rgba(77, 208, 225, 0.15);
          border-radius: 14px;
          padding: 12px;
          font-family: inherit;
          color: var(--on-surface);
          cursor: pointer;
          text-align: left;
          transition: all 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
          overflow: hidden;
        }

        .cw-swatch::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--state-layer-hover);
          opacity: 0;
          transition: opacity 200ms;
        }

        .cw-swatch:hover {
          border-color: rgba(77, 208, 225, 0.35);
          background: rgba(45, 42, 38, 0.8);
          box-shadow: var(--shadow-2);
          transform: translateY(-2px);
        }

        .cw-swatch:hover::before {
          opacity: 1;
        }

        .cw-swatch:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 1px;
        }

        .cw-swatch:active {
          transform: translateY(0);
          box-shadow: var(--shadow-1);
        }

        .cw-chip {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.15), var(--shadow-1);
        }

        .cw-swatch-text {
          min-width: 0;
          flex: 1;
          position: relative;
          z-index: 2;
        }

        .cw-hex {
          font-size: 12px;
          font-weight: 600;
          display: block;
          letter-spacing: 0.02em;
          font-family: 'Roboto Mono', monospace;
        }

        .cw-hue-name {
          font-size: 11px;
          color: var(--on-surface-variant);
          display: block;
          margin-top: 2px;
          font-weight: 400;
        }

        .cw-copied {
          position: absolute;
          top: 8px;
          right: 10px;
          font-size: 9px;
          letter-spacing: 0.05em;
          color: var(--primary);
          text-transform: uppercase;
          font-weight: 600;
          animation: fadeInOut 1200ms ease-in-out;
          pointer-events: none;
          z-index: 3;
        }

        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-4px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-4px); }
        }

        /* ========== ACCESSIBILITY ========== */
        .cw-sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        /* ========== REDUCED MOTION ========== */
        @media (prefers-reduced-motion: reduce) {
          .cw-scheme-btn,
          .cw-swatch,
          .cw-marker-dot,
          .cw-slider-row input[type="range"]::-webkit-slider-thumb,
          .cw-slider-row input[type="range"]::-moz-range-thumb {
            transition: none;
          }
        }
      `}</style>

      <div className="cw-grain" />

      <div className="cw-content">
        <p className="cw-eyebrow">Traditional Pigment Wheel</p>
        <h2 className="cw-title">RYB Color Wheel</h2>
        <p className="cw-subtitle">
          The red-yellow-blue wheel artists have used since Itten. Pick a
          harmony, then drag the wheel — or use the slider — to rotate it.
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
              boxShadow:
                "0 0 0 1px rgba(232,223,200,0.12), 0 10px 30px rgba(0,0,0,0.5)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "11%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)",
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
              transition: isDragging
                ? "none"
                : "transform 300ms cubic-bezier(.2,.8,.2,1)",
              transformOrigin: "50% 50%",
              pointerEvents: "none",
            }}
          >
            <svg
              viewBox="0 0 100 100"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                overflow: "visible",
              }}
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
                  <div
                    className="cw-marker-dot"
                    style={{ width: size, height: size, background: m.color }}
                  />
                </div>
              );
            })}
          </div>

          {RYB_STOPS.map((s) => {
            const p = point(s.angle, TICK_R);
            return (
              <span
                key={s.angle}
                className="cw-tick"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
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
          <span className="cw-slider-val">
            {String(Math.round(baseAngle)).padStart(3, "0")}°
          </span>
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
