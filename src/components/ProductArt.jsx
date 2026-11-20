import { PACKAGING } from '../data/packaging.js';
import { useI18n } from '../i18n/index.jsx';

// Realistic-looking generic packaging drawn in SVG (no real brands, no photos).
// Each shape returns the pack body and where its label goes.
const SHAPES = {
  can: (c) => ({
    body: (
      <>
        <rect x="26" y="14" width="48" height="84" rx="6" fill={c.color} />
        <ellipse cx="50" cy="15" rx="24" ry="5" fill="#d9d9d9" stroke="#a9a9a9" strokeWidth="1" />
        <ellipse cx="50" cy="97" rx="24" ry="5" fill="#bdbdbd" />
      </>
    ),
    label: { x: 26, y: 38, w: 48, h: 34, rx: 0 },
  }),
  tin: (c) => ({
    body: (
      <>
        <rect x="16" y="48" width="68" height="40" rx="5" fill={c.color} />
        <ellipse cx="50" cy="48" rx="34" ry="8" fill="#dcdcdc" stroke="#a9a9a9" />
        <ellipse cx="50" cy="48" rx="26" ry="5" fill="none" stroke="#b5b5b5" />
      </>
    ),
    label: { x: 16, y: 58, w: 68, h: 22, rx: 0 },
  }),
  tray: (c) => ({
    body: (
      <>
        <path d="M10 56 L90 56 L84 90 L16 90 Z" fill="#f4f4f4" stroke="#cfcfcf" />
        <ellipse cx="50" cy="62" rx="34" ry="12" fill={c.color} />
        <ellipse cx="42" cy="60" rx="12" ry="5" fill="#ffffff" opacity="0.35" />
        <path d="M10 56 L90 56" stroke="#e0e0e0" strokeWidth="3" />
      </>
    ),
    label: { x: 28, y: 74, w: 44, h: 13, rx: 2 },
  }),
  box: (c) => ({
    body: (
      <>
        <path d="M22 22 L70 16 L82 24 L82 96 L22 96 Z" fill={c.color} />
        <path d="M70 16 L82 24 L82 96 L70 92 Z" fill="#000" opacity="0.18" />
        <path d="M22 22 L70 16 L82 24 L34 30 Z" fill="#fff" opacity="0.2" />
      </>
    ),
    label: { x: 26, y: 46, w: 42, h: 26, rx: 3 },
  }),
  bag: (c) => ({
    body: (
      <>
        <path d="M30 18 Q50 8 70 18 L76 94 Q50 100 24 94 Z" fill={c.color} stroke="#000" strokeOpacity="0.08" />
        <path d="M44 10 L56 10 L54 20 L46 20 Z" fill="#c8a165" />
        <path d="M34 30 Q50 40 66 30" stroke="#000" strokeOpacity="0.08" fill="none" />
      </>
    ),
    label: { x: 30, y: 52, w: 40, h: 22, rx: 4 },
  }),
  canister: (c) => ({
    body: (
      <>
        <rect x="24" y="18" width="52" height="80" rx="4" fill={c.color} />
        <rect x="22" y="12" width="56" height="10" rx="3" fill="#d35400" />
      </>
    ),
    label: { x: 24, y: 44, w: 52, h: 30, rx: 0 },
  }),
  juicebox: (c) => ({
    body: (
      <>
        <rect x="28" y="26" width="44" height="72" rx="3" fill={c.color} />
        <path d="M28 26 L72 26 L66 18 L34 18 Z" fill="#000" opacity="0.12" />
        <rect x="58" y="6" width="4" height="22" rx="2" fill="#ecf0f1" />
      </>
    ),
    label: { x: 30, y: 48, w: 40, h: 28, rx: 3 },
  }),
  pouch: (c) => ({
    body: (
      <>
        <path d="M24 16 L76 16 L80 98 L20 98 Z" fill={c.color} />
        <path d="M24 16 L76 16 L76 22 L24 22 Z" fill="#000" opacity="0.15" />
        <path d="M20 92 L80 92 L80 98 L20 98 Z" fill="#000" opacity="0.12" />
        <path d="M30 30 Q34 60 28 88" stroke="#fff" strokeOpacity="0.35" strokeWidth="4" fill="none" />
      </>
    ),
    label: { x: 28, y: 46, w: 44, h: 26, rx: 13 },
  }),
  jar: (c) => ({
    body: (
      <>
        <rect x="26" y="26" width="48" height="70" rx="10" fill={c.color} opacity="0.9" />
        <rect x="28" y="14" width="44" height="14" rx="3" fill="#2c3e50" />
      </>
    ),
    label: { x: 28, y: 48, w: 44, h: 28, rx: 3 },
  }),
  tub: (c) => ({
    body: (
      <>
        <path d="M18 40 L82 40 L76 92 L24 92 Z" fill={c.color} stroke="#d0d0d0" />
        <rect x="14" y="32" width="72" height="10" rx="4" fill={c.label} />
      </>
    ),
    label: { x: 26, y: 54, w: 48, h: 22, rx: 4 },
  }),
  bottle: (c) => ({
    body: (
      <>
        <path d="M42 8 L58 8 L58 22 Q74 30 74 46 L74 94 Q74 98 70 98 L30 98 Q26 98 26 94 L26 46 Q26 30 42 22 Z" fill={c.color} stroke="#000" strokeOpacity="0.08" />
        <rect x="41" y="4" width="18" height="8" rx="2" fill="#34495e" />
      </>
    ),
    label: { x: 28, y: 52, w: 44, h: 28, rx: 3 },
  }),
  pot: (c) => ({
    body: (
      <>
        <rect x="20" y="52" width="60" height="38" rx="8" fill={c.color} />
        <rect x="18" y="40" width="64" height="16" rx="5" fill={c.label} />
      </>
    ),
    label: { x: 24, y: 62, w: 52, h: 18, rx: 3 },
  }),
  tube: (c) => ({
    body: (
      <>
        <path d="M30 10 L70 10 L64 84 L36 84 Z" fill={c.color} stroke="#000" strokeOpacity="0.08" />
        <rect x="38" y="84" width="24" height="12" rx="2" fill={c.label} />
        <rect x="30" y="8" width="40" height="5" fill="#000" opacity="0.1" />
      </>
    ),
    label: { x: 35, y: 34, w: 30, h: 26, rx: 3 },
  }),
  pencil: (c) => ({
    body: (
      <>
        <rect x="44" y="10" width="12" height="78" rx="2" fill={c.color} />
        <path d="M44 88 L56 88 L50 100 Z" fill="#111" />
        <rect x="44" y="10" width="12" height="10" fill={c.label} />
      </>
    ),
    label: { x: 22, y: 44, w: 56, h: 14, rx: 7 },
  }),
  shaker: (c) => ({
    body: (
      <>
        <rect x="28" y="24" width="44" height="74" rx="8" fill={c.color} stroke="#000" strokeOpacity="0.08" />
        <rect x="30" y="12" width="40" height="14" rx="5" fill={c.label} />
      </>
    ),
    label: { x: 30, y: 50, w: 40, h: 26, rx: 4 },
  }),
  spray: (c) => ({
    body: (
      <>
        <path d="M32 40 L68 40 L72 98 L28 98 Z" fill={c.color} />
        <rect x="40" y="22" width="20" height="20" rx="2" fill="#ecf0f1" />
        <path d="M40 22 L24 22 L24 30 L40 30 Z" fill="#bdc3c7" />
      </>
    ),
    label: { x: 32, y: 56, w: 40, h: 26, rx: 3 },
  }),
};

export function hasArt(product) {
  return !!(product && PACKAGING[product.id]);
}

export default function ProductArt({ product, size = 120, className = '' }) {
  const { lang } = useI18n();
  const style = PACKAGING[product?.id];
  if (!style) return null;
  const shape = (SHAPES[style.shape] || SHAPES.box)(style);
  const L = shape.label;
  const text = lang === 'ar' ? style.shortAr : style.shortEn;
  const fontSize = Math.min(L.h * 0.5, (L.w / Math.max(text.length, 3)) * (lang === 'ar' ? 1.65 : 1.6));

  return (
    <svg
      className={`product-art ${className}`}
      width={size}
      height={size}
      viewBox="0 0 100 106"
      role="img"
      aria-label={text}
    >
      <ellipse cx="50" cy="101" rx="32" ry="4" fill="#000" opacity="0.12" />
      {shape.body}
      <rect x={L.x} y={L.y} width={L.w} height={L.h} rx={L.rx} fill={style.label} />
      <text
        x={L.x + L.w / 2}
        y={L.y + L.h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={style.ink}
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="'IBM Plex Sans Arabic', system-ui, sans-serif"
        direction={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {text}
      </text>
    </svg>
  );
}
