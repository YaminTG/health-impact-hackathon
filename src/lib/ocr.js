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

/**
 * Crop (optional), downscale + greyscale big phone photos: faster and usually
 * more accurate. crop = { x, y, w, h } as fractions (0..1) of the image.
 */
async function prepareImage(file, maxSide = 2000, crop = null) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('image-load'));
      i.src = url;
    });
    const c = crop || { x: 0, y: 0, w: 1, h: 1 };
    const sx = Math.round(c.x * img.naturalWidth);
    const sy = Math.round(c.y * img.naturalHeight);
    const sw = Math.max(1, Math.round(c.w * img.naturalWidth));
    const sh = Math.max(1, Math.round(c.h * img.naturalHeight));
    // small crops are upscaled a little (Tesseract likes ~30px tall text)
    const scale = Math.min(2, maxSide / Math.max(sw, sh));
    const w = Math.round(sw * scale);
    const h = Math.round(sh * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
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
export async function recognizeLabel(file, onProgress = () => {}, crop = null) {
  currentLogger = (m) => {
    if (m.status === 'recognizing text') onProgress({ phase: 'reading', pct: Math.round((m.progress || 0) * 100) });
    else onProgress({ phase: 'loading', pct: Math.round((m.progress || 0) * 100) });
  };
  onProgress({ phase: 'loading', pct: 0 });
  const [worker, canvas] = await Promise.all([getWorker(), prepareImage(file, 2000, crop)]);
  const { data } = await worker.recognize(canvas);
  return (data?.text || '').trim();
}
