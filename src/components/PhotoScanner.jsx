import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, RotateCcw, Keyboard, TriangleAlert, Sparkles, Crop, Maximize, Apple, Sparkle, SprayCan, Wand2, CircleCheck, FileText } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { recognizeLabel } from '../lib/ocr.js';
import { classify, classifyNonFood, detectKindDetailed, CATEGORIES, KINDS, emojiFor } from '../lib/classify.js';
import { extractIngredientSections, cleanDisplay } from '../lib/labelText.js';
import { scoreProduct } from '../lib/scoring.js';
import { isAlcoholicText } from '../lib/alcohol.js';
import RiskBadge from './RiskBadge.jsx';
import CropBox from './CropBox.jsx';

const KIND_ICON = { food: Apple, cosmetic: Sparkle, household: SprayCan };
const DEFAULT_CROP = { x: 0.08, y: 0.2, w: 0.84, h: 0.5 };

/**
 * Photo flow: 1) choose product type  2) take photo  3) crop to the ingredients
 * 4) OCR  5) review the extracted ingredient section(s), then analyse.
 */
export default function PhotoScanner({ onDone, initialKind = '' }) {
  const { t } = useI18n();
  const fileRef = useRef(null);
  const fileObj = useRef(null);
  const [phase, setPhase] = useState('choose'); // choose | crop | working | review
  const [chosenKind, setChosenKind] = useState(initialKind); // '' | 'auto' | food | cosmetic | household
  const [progress, setProgress] = useState({ phase: 'loading', pct: 0 });
  const [preview, setPreview] = useState('');
  const [crop, setCrop] = useState(DEFAULT_CROP);
  const [fullText, setFullText] = useState(''); // everything OCR read
  const [text, setText] = useState(''); // editable: ingredient section(s)
  const [sectionFound, setSectionFound] = useState(null);
  const [name, setName] = useState('');
  const [catOverride, setCatOverride] = useState('');
  const [error, setError] = useState('');

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  // Product type: what the user chose, otherwise a weighted guess from the whole label
  const detected = useMemo(() => detectKindDetailed(`${fullText}\n${text}`), [fullText, text]);
  const isAuto = !chosenKind || chosenKind === 'auto';
  const kind = isAuto ? detected.kind : chosenKind;
  const needsKindChoice = isAuto && text.trim() && !detected.confident;

  const draft = useMemo(() => {
    if (kind === 'food') {
      const ex = classify(text, { fullText });
      const category = catOverride || ex.category;
      const { signals, ...rest } = ex;
      return { product: { ...rest, kind: 'food', category, emoji: emojiFor(category) }, signals };
    }
    return { product: classifyNonFood(text, kind), signals: [] };
  }, [text, fullText, kind, catOverride]);
  const verdict = scoreProduct(draft.product);

  function chooseAndShoot(k) {
    setChosenKind(k);
    fileRef.current?.click();
  }

  function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    fileObj.current = file;
    setError('');
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setCrop(DEFAULT_CROP);
    setPhase('crop');
  }

  async function runOcr(useCrop) {
    setPhase('working');
    setError('');
    try {
      const out = await recognizeLabel(fileObj.current, setProgress, useCrop ? crop : null);
      const ex = extractIngredientSections(out);
      setFullText(cleanDisplay(out));
      setText(ex.text);
      setSectionFound(ex.found);
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
    const p = { ...draft.product };
    p.productName = p.productNameAr = p.nameEn = p.nameAr = cleanName;
    // alcoholic drinks are not supported (checked on the whole label, e.g. "5% vol")
    if (kind === 'food') p.alcoholic = isAlcoholicText(`${fullText}\n${text}\n${name}`);
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

      {phase === 'choose' && (
        <>
          <h2 className="section-title">{t('kind.question')}</h2>
          <div className="kind-grid">
            {KINDS.map((k) => {
              const Icon = KIND_ICON[k];
              return (
                <button key={k} className="kind-tile" onClick={() => chooseAndShoot(k)}>
                  <Icon size={28} />
                  <strong>{t(`kind.${k}`)}</strong>
                  <small>{t(`kind.${k}.examples`)}</small>
                </button>
              );
            })}
          </div>
          <button className="btn btn-ghost btn-block" onClick={() => chooseAndShoot('auto')}>
            <Wand2 size={18} /> {t('kind.autoButton')}
          </button>
          <p className="muted small center">{t('ocr.help')}</p>
          <button
            className="btn btn-ghost btn-block"
            onClick={() => {
              setChosenKind(chosenKind || 'auto');
              setPhase('review');
            }}
          >
            <Keyboard size={18} /> {t('ocr.typeInstead')}
          </button>
        </>
      )}

      {phase === 'crop' && preview && (
        <>
          <div className="alert alert-info">
            <Crop size={18} />
            <span>{t('crop.help')}</span>
          </div>
          <CropBox src={preview} value={crop} onChange={setCrop} label={t('crop.label')} />
          <button className="btn btn-primary btn-block btn-lg" onClick={() => runOcr(true)}>
            <Crop size={18} /> {t('crop.read')}
          </button>
          <div className="row">
            <button className="btn btn-secondary btn-grow" onClick={() => runOcr(false)}>
              <Maximize size={18} /> {t('crop.whole')}
            </button>
            <button className="btn btn-ghost btn-grow" onClick={openPicker}>
              <RotateCcw size={18} /> {t('ocr.retake')}
            </button>
          </div>
        </>
      )}

      {phase === 'working' && (
        <div className="card section center" role="status" aria-live="polite">
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

          <div className="card section">
            <h2 className="section-title">{t('ocr.review')}</h2>

            <div className="field">
              <span className="small">{t('kind.question')}</span>
              <div className="seg seg-full" role="radiogroup">
                {KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={!needsKindChoice && kind === k}
                    className={!needsKindChoice && kind === k ? 'on' : ''}
                    onClick={() => setChosenKind(k)}
                  >
                    {t(`kind.${k}`)}
                  </button>
                ))}
              </div>
              {needsKindChoice && (
                <span className="alert alert-error small">
                  <TriangleAlert size={16} /> {t('kind.unsure')}
                </span>
              )}
              {isAuto && !needsKindChoice && text.trim() && <span className="muted small">{t('kind.auto')}</span>}
            </div>

            {sectionFound === true && (
              <span className="chip chip-green">
                <CircleCheck size={14} /> {t('ocr.sectionFound')}
              </span>
            )}
            {sectionFound === false && text.trim() && (
              <span className="alert alert-info small">
                <FileText size={16} /> {t('ocr.sectionMissing')}
              </span>
            )}

            <p className="muted small">{t('ocr.reviewHelp')}</p>
            <textarea
              className="input"
              dir="auto"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="المكونات: ... / Ingredients: ..."
            />
            {fullText && text !== fullText && (
              <button className="btn btn-ghost btn-sm" onClick={() => setText(fullText)}>
                <FileText size={16} /> {t('ocr.showAll')}
              </button>
            )}

            <label className="field">
              <span className="small">{t('ocr.productName')}</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            {kind === 'food' && !needsKindChoice && (
              <label className="field">
                <span className="small">{t('ocr.detected')}</span>
                <select className="input" value={draft.product.category} onChange={(e) => setCatOverride(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {emojiFor(c)} {t(`cat.${c}`)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {kind === 'food' && draft.signals.length > 0 && !needsKindChoice && (
              <div>
                <p className="small muted">{t('ocr.signals')}</p>
                <div className="signal-chips">
                  {draft.signals
                    .filter((s) => s.key !== 'sig.sectionFound')
                    .map((s) => (
                      <span key={s.key} className={`chip chip-${s.tone === 'neutral' ? 'x' : s.tone}`}>
                        {t(s.key, s.vars)}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {text.trim() && !needsKindChoice && (
              <div className="preview-verdict">
                <span className="small muted">{t('ocr.preview')}</span>
                <RiskBadge verdict={verdict} size="sm" />
                {kind !== 'food' && !['no_concerns', 'no_ingredients'].includes(verdict.rules[0].id) && (
                  <div className="signal-chips">
                    {verdict.rules.map((r) => (
                      <span key={r.id} className={`chip chip-${r.tier}`}>
                        {t(`concern.${r.id}`)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button className="btn btn-primary btn-block btn-lg" onClick={analyze} disabled={!text.trim() || needsKindChoice}>
              <Sparkles size={18} /> {t('ocr.analyze')}
            </button>
          </div>

          {preview && (
            <details className="card">
              <summary className="small">{t('ocr.photo')}</summary>
              <img src={preview} alt="" className="preview-img" style={{ marginTop: 8 }} />
            </details>
          )}
          <div className="row">
            {preview && (
              <button className="btn btn-secondary btn-grow" onClick={() => setPhase('crop')}>
                <Crop size={18} /> {t('crop.again')}
              </button>
            )}
            <button className="btn btn-ghost btn-grow" onClick={openPicker}>
              <Camera size={18} /> {preview ? t('ocr.retake') : t('ocr.take')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
