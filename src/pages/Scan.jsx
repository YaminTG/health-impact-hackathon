import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, ScanBarcode, Ban, ScanLine } from 'lucide-react';
import { isBlockedProduct } from '../lib/alcohol.js';
import ProductImage from '../components/ProductImage.jsx';
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
  const [params, setParams] = useSearchParams();
  // The mode lives in the URL (/scan, /scan?mode=barcode, /scan?mode=photo) so the
  // back button and the bottom "Scan" tab always work without a page refresh.
  const mode = ['photo', 'barcode'].includes(params.get('mode')) ? params.get('mode') : 'menu';
  const setMode = (m) => setParams(m === 'menu' ? {} : { mode: m });
  const blocked = params.get('unsupported') === '1';
  const [busy, setBusy] = useState(false);
  const [demoKind, setDemoKind] = useState('food');
  const demoProducts = PRODUCTS.filter((p) => (p.kind || 'food') === demoKind);

  /** Every scan path ends here: save to history and show the result. */
  function finish(product, source) {
    // Alcoholic drinks are not supported: nothing is analysed, saved or suggested.
    if (isBlockedProduct(product)) {
      setParams({ unsupported: '1' }, { replace: true });
      return;
    }
    const scan = addScan(product, source);
    navigate(`/result/${scan.id}`);
  }

  function pickDemo(p) {
    setBusy(true);
    // short pause so the demo feels like a real scan
    setTimeout(() => finish(p, 'demo'), 450);
  }

  if (blocked)
    return (
      <Page title={t('scan.title')} back>
        <section className="card unsupported" role="alert">
          <Ban size={44} />
          <h1>{t('unsupported.title')}</h1>
          <p>{t('unsupported.text')}</p>
          <button className="btn btn-primary btn-block btn-lg" onClick={() => setMode('menu')}>
            <ScanLine size={18} /> {t('res.scanAnother')}
          </button>
        </section>
      </Page>
    );

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
              <ProductImage product={p} size="md" />
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
