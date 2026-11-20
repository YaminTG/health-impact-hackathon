// On-device OCR with Tesseract.js (Arabic + English). Loaded lazily so the
// main bundle stays small; worker, core and language data come from the CDN
// the first time and are then cached (IndexedDB + service worker).
let workerPromise = null;
let currentLogger = () => {};

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      return createWorker('ara+eng', 1, {
        logger: (m) => currentLogger(m),
      });
    })().catch((e) => {
      workerPromise = null; // allow retry
      throw e;
    });
  }
  return workerPromise;
}

/** Downscale + greyscale big phone photos: faster and usually more accurate. */
async function prepareImage(file, maxSide = 1800) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('image-load'));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      // luminance + mild contrast stretch
      let y = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      y = Math.max(0, Math.min(255, (y - 128) * 1.25 + 128));
      px[i] = px[i + 1] = px[i + 2] = y;
    }
    ctx.putImageData(data, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * @param {File} file image file
 * @param {(p: {phase: 'loading'|'reading', pct: number}) => void} onProgress
 * @returns {Promise<string>} recognised text
 */
export async function recognizeLabel(file, onProgress = () => {}) {
  currentLogger = (m) => {
    if (m.status === 'recognizing text') onProgress({ phase: 'reading', pct: Math.round((m.progress || 0) * 100) });
    else onProgress({ phase: 'loading', pct: Math.round((m.progress || 0) * 100) });
  };
  onProgress({ phase: 'loading', pct: 0 });
  const [worker, canvas] = await Promise.all([getWorker(), prepareImage(file)]);
  const { data } = await worker.recognize(canvas);
  return (data?.text || '').trim();
}
