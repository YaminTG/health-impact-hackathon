import { useRef } from 'react';

const MIN = 0.08;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Touch-friendly crop rectangle over an image.
 * value/onChange: { x, y, w, h } as fractions (0..1) of the image.
 * Drag inside to move, drag a corner to resize.
 */
export default function CropBox({ src, value, onChange, label }) {
  const wrapRef = useRef(null);
  const drag = useRef(null);

  function onDown(mode) {
    return (e) => {
      e.preventDefault();
      e.stopPropagation();
      const box = wrapRef.current.getBoundingClientRect();
      drag.current = { mode, startX: e.clientX, startY: e.clientY, start: { ...value }, box };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    };
  }

  function onMove(e) {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / d.box.width;
    const dy = (e.clientY - d.startY) / d.box.height;
    let { x, y, w, h } = d.start;
    if (d.mode === 'move') {
      x = clamp(x + dx, 0, 1 - w);
      y = clamp(y + dy, 0, 1 - h);
    } else {
      if (d.mode.includes('w')) {
        const nx = clamp(x + dx, 0, x + w - MIN);
        w += x - nx;
        x = nx;
      }
      if (d.mode.includes('e')) w = clamp(w + dx, MIN, 1 - x);
      if (d.mode.includes('n')) {
        const ny = clamp(y + dy, 0, y + h - MIN);
        h += y - ny;
        y = ny;
      }
      if (d.mode.includes('s')) h = clamp(h + dy, MIN, 1 - y);
    }
    onChange({ x, y, w, h });
  }

  const onUp = () => {
    drag.current = null;
  };

  const pct = (v) => `${v * 100}%`;
  return (
    <div
      ref={wrapRef}
      className="cropbox"
      dir="ltr"
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <img src={src} alt="" draggable="false" />
      <div
        className="crop-rect"
        style={{ left: pct(value.x), top: pct(value.y), width: pct(value.w), height: pct(value.h) }}
        onPointerDown={onDown('move')}
        role="slider"
        aria-label={label}
        aria-valuetext={`${Math.round(value.w * 100)}% × ${Math.round(value.h * 100)}%`}
      >
        {['nw', 'ne', 'sw', 'se'].map((c) => (
          <span key={c} className={`crop-handle ${c}`} onPointerDown={onDown(c)} />
        ))}
      </div>
    </div>
  );
}
