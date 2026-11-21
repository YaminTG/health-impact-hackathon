import { Link } from 'react-router-dom';
import { ScanLine, Users, TriangleAlert, Package } from 'lucide-react';
import BarChart from '../components/BarChart.jsx';
import { useI18n } from '../i18n/index.jsx';
import data from '../data/dashboard.json';

export default function Dashboard() {
  const { t, pick, toggle, lang } = useI18n();
  const nf = (n) => n.toLocaleString(lang === 'ar' ? 'en-US' : 'en-GB');
  const maxTrend = Math.max(...data.weeklyTrend.map((w) => w.scans));

  const kpis = [
    { icon: ScanLine, label: t('dash.kpi.scans'), value: nf(data.kpis.scans) },
    { icon: Users, label: t('dash.kpi.users'), value: nf(data.kpis.activeUsers) },
    { icon: TriangleAlert, label: t('dash.kpi.highRisk'), value: `${Math.round(data.kpis.highRiskScanShare * 100)}%` },
    { icon: Package, label: t('dash.kpi.fit'), value: nf(data.kpis.fitRequests) },
  ];

  return (
    <div className="dashboard">
      <header className="dash-head">
        <div>
          <h1>{t('dash.title')}</h1>
          <p className="muted">{t('dash.subtitle')}</p>
          <p className="small">
            <span className="muted">{pick(data.period)}</span>
          </p>
        </div>
        <div className="dash-actions">
          <button className="lang-btn" onClick={toggle}>
            {t('lang.toggle')}
          </button>
          <Link to="/" className="btn btn-secondary">
            {t('dash.backToApp')}
          </Link>
        </div>
      </header>

      <section className="kpi-grid">
        {kpis.map(({ icon: Icon, label, value }) => (
          <div key={label} className="kpi">
            <span>
              <Icon size={16} style={{ verticalAlign: 'middle' }} /> {label}
            </span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      <div className="dash-grid">
        <section className="card">
          <h2>{t('dash.scansByArea')}</h2>
          <BarChart rows={data.scansByArea.map((r) => ({ label: pick(r), value: r.value }))} format={nf} />
        </section>

        <section className="card">
          <h2>{t('dash.patterns')}</h2>
          <BarChart
            rows={data.highRiskPatterns.map((r) => ({ label: pick(r), value: r.value }))}
            max={100}
            unit="%"
            color="red"
          />
        </section>

        <section className="card">
          <h2>{t('dash.screening')}</h2>
          <BarChart
            color="blue"
            format={nf}
            rows={data.screeningByArea.map((r) => ({
              label: pick(r),
              value: r.requests,
              sub: `${nf(r.eligible)} ${t('dash.eligible')} · ${t('dash.uptake')} ${Math.round((r.requests / r.eligible) * 100)}%`,
            }))}
          />
        </section>

        <section className="card">
          <h2>{t('dash.trend')}</h2>
          <div className="trend">
            {data.weeklyTrend.map((w) => (
              <div key={w.week} className="trend-col" title={`${w.scans} scans · ${t('dash.avgScore')} ${w.avgGutScore}`}>
                <span className="trend-score">{w.avgGutScore}</span>
                <span className="trend-bar" style={{ height: `${(w.scans / maxTrend) * 75}%` }} />
                <span>{w.week}</span>
              </div>
            ))}
          </div>
          <p className="muted small">{t('dash.trendLegend')}</p>
        </section>
      </div>
    </div>
  );
}
