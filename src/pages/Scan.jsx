import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, ScanBarcode } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import { TierDot } from '../components/RiskBadge.jsx';
import BarcodeScanner from '../components/BarcodeScanner.jsx';
import PhotoScanner from '../components/PhotoScanner.jsx';
import { useI18n } from '../i18n/index.jsx';
import { PRODUCTS } from '../lib/catalog.js';
import { scoreProduct } from '../lib/scoring.js';
import { KINDS } from '../lib/classify.js';
import { addScan } from '../lib/storage.js';

export default function Scan() {
  const { t, pick } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // /scan?mode=photo or /scan?mode=barcode opens that path directly
  const [mode, setMode] = useState(() => (['photo', 'barcode'].includes(params.get('mode')) ? params.get('mode') : 'menu'));
  const [busy, setBusy] = useState(false);
  const [demoKind, setDemoKind] = useState('food');
  const demoProducts = PRODUCTS.filter((p) => (p.kind || 'food') === demoKind);

  /** Every scan path ends here: save to history and show the result. */
  function finish(product, source) {
    const scan = addScan(product, source);
    navigate(`/result/${scan.id}`);
  }

  function pickDemo(p) {
    setBusy(true);
    // short pause so the demo feels like a real scan
    setTimeout(() => finish(p, 'demo'), 450);
  }

  if (mode === 'barcode')
    return (
      <Page title={t('bc.title')} back>
        <BarcodeScanner onFound={finish} onClose={() => setMode('menu')} onTryPhoto={() => setMode('photo')} />
      </Page>
    );
  if (mode === 'photo')
    return (
      <Page title={t('ocr.title')} back>
        <PhotoScanner onDone={(p) => finish(p, 'ocr')} onClose={() => setMode('menu')} />
      </Page>
    );

  return (
    <Page>
      <h1 className="page-title">{t('scan.title')}</h1>
      <div className="scan-options">
        <button className="scan-option" onClick={() => setMode('photo')}>
          <Camera size={30} />
          <strong>{t('scan.photoTitle')}</strong>
          <small>{t('scan.photoText')}</small>
        </button>
        <button className="scan-option" onClick={() => setMode('barcode')}>
          <ScanBarcode size={30} />
          <strong>{t('scan.barcodeTitle')}</strong>
          <small>{t('scan.barcodeText')}</small>
        </button>
      </div>

      <section className="section">
        <h2 className="section-title">{t('scan.demoTitle')}</h2>
        <p className="muted small">{t('scan.demoText')}</p>
        <div className="seg seg-full" role="tablist">
          {KINDS.map((k) => (
            <button key={k} role="tab" aria-selected={demoKind === k} className={demoKind === k ? 'on' : ''} onClick={() => setDemoKind(k)}>
              {t(`kind.${k}`)}
            </button>
          ))}
        </div>
        <div className="demo-grid">
          {demoProducts.map((p) => (
            <button key={p.id} className="demo-tile" onClick={() => pickDemo(p)} disabled={busy}>
              <span className="demo-emoji">{p.emoji}</span>
              <span className="demo-name">{pick(p)}</span>
              <TierDot tier={scoreProduct(p).tier} />
            </button>
          ))}
        </div>
      </section>

      {busy && (
        <div className="overlay" role="alert" aria-busy="true">
          <div className="scanner-anim" />
          <p>{t('scan.analyzing')}</p>
        </div>
      )}
    </Page>
  );
}
