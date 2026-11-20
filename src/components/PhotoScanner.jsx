import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, RotateCcw, Keyboard, TriangleAlert, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { recognizeLabel } from '../lib/ocr.js';
import { classify, CATEGORIES, emojiFor } from '../lib/classify.js';

export default function PhotoScanner({ onDone }) {
  const { t } = useI18n();
  const fileRef = useRef(null);
  const [phase, setPhase] = useState('idle'); // idle | working | review
  const [progress, setProgress] = useState({ phase: 'loading', pct: 0 });
  const [preview, setPreview] = useState('');
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [catOverride, setCatOverride] = useState('');
  const [error, setError] = useState('');

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  // Live classification preview while the user edits the text
  const extracted = useMemo(() => classify(text), [text]);
  const category = catOverride || extracted.category;

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setPreview(URL.createObjectURL(file));
    setPhase('working');
    try {
      const out = await recognizeLabel(file, setProgress);
      setText(out);
      if (!out || out.replace(/\s/g, '').length < 4) setError(t('ocr.empty'));
      setPhase('review');
    } catch (err) {
      console.error(err);
      setError(t('ocr.error'));
      setPhase('review');
    }
  }

  function analyze() {
    const cleanName = name.trim() || t('ocr.defaultName');
    const p = { ...extracted, category, emoji: emojiFor(category) };
    p.productName = p.productNameAr = p.nameEn = p.nameAr = cleanName;
    delete p.signals;
    onDone(p);
  }

  const openPicker = () => fileRef.current?.click();

  return (
    <div className="section">
      {/* Primary, most reliable capture path on iOS + Android */}
      <input
        ref={fileRef}
        className="file-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
        aria-hidden="true"
        tabIndex={-1}
      />

      {phase === 'idle' && (
        <>
          <div className="card center section">
            <Camera size={48} className="muted" style={{ margin: '0 auto' }} />
            <p>{t('ocr.help')}</p>
            <button className="btn btn-primary btn-block btn-lg" onClick={openPicker}>
              <Camera size={20} /> {t('ocr.take')}
            </button>
          </div>
          <button className="btn btn-ghost btn-block" onClick={() => setPhase('review')}>
            <Keyboard size={18} /> {t('ocr.typeInstead')}
          </button>
        </>
      )}

      {phase === 'working' && (
        <div className="card section center" role="status" aria-live="polite">
          {preview && <img src={preview} alt="" className="preview-img" />}
          <div className="spinner" style={{ margin: '0 auto' }} />
          <p>{progress.phase === 'reading' ? t('ocr.reading', { pct: progress.pct }) : t('ocr.loading')}</p>
          <div className="progress" aria-hidden="true">
            <span style={{ inlineSize: `${progress.phase === 'reading' ? progress.pct : Math.min(progress.pct, 100) * 0.15}%` }} />
          </div>
        </div>
      )}

      {phase === 'review' && (
        <>
          {error && (
            <div className="alert alert-error">
              <TriangleAlert size={18} />
              <span>{error}</span>
            </div>
          )}
          {preview && <img src={preview} alt="" className="preview-img" />}
          <div className="card section">
            <h2 className="section-title">{t('ocr.review')}</h2>
            <p className="muted small">{t('ocr.reviewHelp')}</p>
            <label className="field">
              <span className="small">{t('ocr.productName')}</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <textarea
              className="input"
              dir="auto"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="المكونات: ... / Ingredients: ..."
            />
            <label className="field">
              <span className="small">{t('ocr.detected')}</span>
              <select className="input" value={category} onChange={(e) => setCatOverride(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {emojiFor(c)} {t(`cat.${c}`)}
                  </option>
                ))}
              </select>
            </label>
            {extracted.signals.length > 0 && (
              <div>
                <p className="small muted">{t('ocr.signals')}</p>
                <div className="signal-chips">
                  {extracted.signals.map((s) => (
                    <span key={s.key} className={`chip chip-${s.tone === 'neutral' ? 'x' : s.tone}`}>
                      {t(s.key, s.vars)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <button className="btn btn-primary btn-block btn-lg" onClick={analyze} disabled={!text.trim()}>
              <Sparkles size={18} /> {t('ocr.analyze')}
            </button>
          </div>
          <button className="btn btn-secondary btn-block" onClick={openPicker}>
            <RotateCcw size={18} /> {preview ? t('ocr.retake') : t('ocr.take')}
          </button>
        </>
      )}
    </div>
  );
}
