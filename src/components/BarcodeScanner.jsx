import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Search, TriangleAlert, ScanText, Image as ImageIcon } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { findByBarcode } from '../lib/catalog.js';
import { lookupBarcodeOnline } from '../lib/openFoodFacts.js';

let readerPromise = null;
/** Lazy-load ZXing (keeps the main bundle small). */
function getReader() {
  if (!readerPromise) {
    readerPromise = Promise.all([import('@zxing/browser'), import('@zxing/library')]).then(([browser, lib]) => {
      const hints = new Map();
      hints.set(lib.DecodeHintType.POSSIBLE_FORMATS, [
        lib.BarcodeFormat.EAN_13, lib.BarcodeFormat.EAN_8, lib.BarcodeFormat.UPC_A,
        lib.BarcodeFormat.UPC_E, lib.BarcodeFormat.CODE_128,
      ]);
      hints.set(lib.DecodeHintType.TRY_HARDER, true);
      return new browser.BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });
    });
  }
  return readerPromise;
}

export default function BarcodeScanner({ onFound, onTryPhoto }) {
  const { t } = useI18n();
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const fileRef = useRef(null);
  const busyRef = useRef(false);
  const [camOn, setCamOn] = useState(false);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState(''); // '' | searching | notFound
  const [error, setError] = useState('');

  const secure = typeof window !== 'undefined' && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCamOn(false);
  }

  useEffect(() => {
    if (secure) startCamera();
    return () => controlsRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    setError('');
    if (!secure) return setError(t('bc.cameraInsecure'));
    try {
      const reader = await getReader();
      setCamOn(true);
      controlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        videoRef.current,
        (result) => {
          if (result && !busyRef.current) {
            if (navigator.vibrate) navigator.vibrate(80);
            lookup(result.getText());
          }
        },
      );
    } catch (e) {
      console.error(e);
      setCamOn(false);
      setError(e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? t('bc.cameraDenied') : t('bc.cameraError'));
    }
  }

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setStatus('searching');
    const url = URL.createObjectURL(file);
    try {
      const reader = await getReader();
      const result = await reader.decodeFromImageUrl(url);
      await lookup(result.getText());
    } catch (err) {
      console.warn(err);
      setStatus('');
      setError(t('bc.noCodeInPhoto'));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function lookup(raw) {
    const c = String(raw || '').replace(/\D/g, '');
    if (!c || busyRef.current) return;
    busyRef.current = true;
    setCode(c);
    setError('');
    setStatus('searching');
    stopCamera();
    try {
      // 1) our own database (works offline)
      const local = findByBarcode(c);
      if (local) return onFound(local, 'barcode');
      // 2) Open Food Facts -> Open Beauty Facts -> Open Products Facts
      const hit = await lookupBarcodeOnline(c);
      if (hit) return onFound(hit.product, hit.source);
      // 3) not found anywhere -> offer the photo path
      setStatus('notFound');
    } catch (e) {
      setStatus('');
      setError(e?.code === 'network' ? t('bc.offError') : t('bc.notFound'));
    } finally {
      busyRef.current = false;
    }
  }

  return (
    <div className="section">
      <input ref={fileRef} className="file-input" type="file" accept="image/*" capture="environment" onChange={onPhoto} tabIndex={-1} aria-hidden="true" />

      {secure && (
        <div className="video-wrap" hidden={!camOn}>
          <video ref={videoRef} muted playsInline autoPlay />
          <div className="video-frame" />
          <p className="video-hint">{t('bc.pointCamera')}</p>
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          <TriangleAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {status === 'searching' && (
        <div className="alert alert-info" role="status">
          <div className="spinner" style={{ width: 20, height: 20, borderWidth: 3 }} />
          <span>{t('bc.searching')}</span>
        </div>
      )}

      {status === 'notFound' && (
        <div className="card section center">
          <p>
            <strong dir="ltr">{code}</strong>
          </p>
          <p>{t('bc.notFound')}</p>
          <button className="btn btn-primary btn-block" onClick={onTryPhoto}>
            <ScanText size={18} /> {t('bc.tryPhoto')}
          </button>
        </div>
      )}

      <div className="btn-stack">
        {secure &&
          (camOn ? (
            <button className="btn btn-ghost btn-block" onClick={stopCamera}>
              <CameraOff size={18} /> {t('bc.stopCamera')}
            </button>
          ) : (
            <button className="btn btn-secondary btn-block" onClick={startCamera}>
              <Camera size={18} /> {t('bc.startCamera')}
            </button>
          ))}
        <button className="btn btn-secondary btn-block" onClick={() => fileRef.current?.click()}>
          <ImageIcon size={18} /> {t('bc.photoOfBarcode')}
        </button>
      </div>

      <form
        className="card section"
        onSubmit={(e) => {
          e.preventDefault();
          lookup(code);
        }}
      >
        <label className="field">
          <span>{t('bc.manual')}</span>
          <div className="row">
            <input
              className="input"
              dir="ltr"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="6251000000011"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 14));
                setStatus('');
              }}
            />
            <button className="btn btn-primary" type="submit" disabled={code.length < 6 || status === 'searching'}>
              <Search size={18} /> {t('bc.lookup')}
            </button>
          </div>
        </label>
        <p className="muted small">{t('bc.hint')}</p>
      </form>
    </div>
  );
}
