// Minimal, dependency-free horizontal bar chart (RTL-aware via logical CSS).
export default function BarChart({ rows, format = (v) => v.toLocaleString(), max, unit = '', color = 'teal' }) {
  const top = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className={`barchart color-${color}`}>
      {rows.map((r) => (
        <li key={r.label} className="bar-row">
          <span className="bar-label">{r.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ inlineSize: `${(r.value / top) * 100}%` }} />
          </span>
          <span className="bar-value">
            {format(r.value)}
            {unit}
          </span>
          {r.sub && <span className="bar-sub">{r.sub}</span>}
        </li>
      ))}
    </ul>
  );
}
