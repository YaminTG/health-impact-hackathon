import { Link } from 'react-router-dom';
import { ScanLine, Users, TriangleAlert, Package, ShoppingBag, Repeat, ShoppingBasket } from 'lucide-react';
import BarChart from '../components/BarChart.jsx';
import { useI18n } from '../i18n/index.jsx';
import data from '../data/dashboard.json';
import { getScans, getOrders, getFitRequests } from '../lib/storage.js';
import { getOrderable } from '../lib/market.js';

/** Aggregates add this phone's own scans and orders on top of the base numbers. */
function useAggregates() {
  const scans = getScans();
  const orders = getOrders();
  const byType = Object.fromEntries(data.ordersByType.map((r) => [r.type, r.value]));
  for (const o of orders) {
    for (const line of o.items || [{ itemId: o.itemId, qty: o.qty }]) {
      const type = getOrderable(line.itemId)?.vendor?.type || 'shop';
      byType[type] = (byType[type] || 0) + (Number(line.qty) || 1);
    }
  }
  // healthier swaps: a scanned product replaced by an ordered / basket-added substitute
  const swapped = scans.filter((s) => s.decision === 'swapped');
  const from = Object.fromEntries(data.swapsFrom.map((r) => [r.category, r.value]));
  for (const s of swapped) {
    const c = s.product?.kind && s.product.kind !== 'food' ? s.product.kind : s.product?.category || 'other';
    from[c] = (from[c] || 0) + 1;
  }
  return {
    swaps: data.kpis.swaps + swapped.length,
    swapsFrom: Object.entries(from)
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value),
    scans: data.kpis.scans + scans.length,
    orders: data.kpis.orders + orders.length,
    fit: data.kpis.fitRequests + getFitRequests().length,
    ordersByType: Object.entries(byType)
      .map(([type, value]) => ({ type, value }))
      .sort((a, b) => b.value - a.value),
  };
}

export default function Dashboard() {
  const { t, pick, toggle, lang } = useI18n();
  const nf = (n) => n.toLocaleString(lang === 'ar' ? 'en-US' : 'en-GB');
  const maxTrend = Math.max(...data.weeklyTrend.map((w) => w.orders));
  const agg = useAggregates();

  const kpis = [
    { icon: ScanLine, label: t('dash.kpi.scans'), value: nf(agg.scans) },
    { icon: Users, label: t('dash.kpi.users'), value: nf(data.kpis.activeUsers) },
    { icon: TriangleAlert, label: t('dash.kpi.highRisk'), value: `${Math.round(data.kpis.highRiskScanShare * 100)}%` },
    { icon: ShoppingBag, label: t('dash.kpi.orders'), value: nf(agg.orders) },
    { icon: Repeat, label: t('dash.kpi.swaps'), value: nf(agg.swaps) },
    { icon: Repeat, label: t('dash.kpi.swapRate'), value: `${Math.round(data.kpis.swapRate * 100)}%` },
    { icon: ShoppingBasket, label: t('dash.kpi.basketRate'), value: `${Math.round(data.kpis.basketRate * 100)}%` },
    { icon: Package, label: t('dash.kpi.fit'), value: nf(agg.fit) },
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
          <h2>{t('dash.scanMix')}</h2>
          <BarChart
            rows={data.scanMix.map((r) => ({ label: pick(r), value: r.value }))}
            max={Math.max(...data.scanMix.map((r) => r.value))}
            unit="%"
            color="amber"
          />
        </section>

        <section className="card">
          <h2>{t('dash.carcinogens')}</h2>
          <BarChart rows={data.carcinogenFlags.map((r) => ({ label: pick(r), value: r.value }))} max={100} unit="%" color="red" />
        </section>

        <section className="card">
          <h2>{t('dash.swapsFrom')}</h2>
          <BarChart
            rows={agg.swapsFrom.map((r) => ({ label: t(['cosmetic', 'household'].includes(r.category) ? `kind.${r.category}` : `cat.${r.category}`), value: r.value }))}
            format={nf}
            color="green"
          />
        </section>

        <section className="card">
          <h2>{t('dash.ordersByType')}</h2>
          <BarChart rows={agg.ordersByType.map((r) => ({ label: t(`vendor.${r.type}`), value: r.value }))} format={nf} color="green" />
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
              <div key={w.week} className="trend-col" title={`${nf(w.scans)} · ${nf(w.orders)}`}>
                <span className="trend-score trend-risk">{w.highRiskShare}%</span>
                <span className="trend-bar" style={{ height: `${(w.orders / maxTrend) * 75}%` }} />
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
