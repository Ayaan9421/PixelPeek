/**
 * nsfwCheck.js
 *
 * Client-side NSFW image check using nsfwjs + @tensorflow/tfjs.
 * Runs entirely in the browser — the image is never sent to any server
 * until it has already been cleared.
 *
 * The nsfwjs model is ~10 MB and is lazy-loaded on first use, so there's
 * no impact on initial page load. Subsequent checks within the same
 * browser session reuse the cached model instance.
 *
 * NSFW categories returned by the model:
 *   Drawing, Hentai, Neutral, Porn, Sexy
 *
 * We block on: Porn + Hentai above threshold, and flag Sexy above a
 * higher threshold so borderline swimwear / art doesn't get false-flagged.
 */

const PORN_THRESHOLD = 0.60   // block if Porn or Hentai >= 60 %
const SEXY_THRESHOLD = 0.85   // block if Sexy >= 85 % (very high bar)

let _model = null

async function getNsfwModel() {
  if (_model) return _model

  // Both packages need to be installed:
  //   npm install nsfwjs @tensorflow/tfjs
  const [nsfwjs] = await Promise.all([
    import('nsfwjs'),
    import('@tensorflow/tfjs'),   // registers the WebGL backend
  ])

  console.log('[NSFW] Loading model…')
  // The model is served from the nsfwjs CDN by default.
  // For production you can self-host the model files and pass a custom URL.
  _model = await nsfwjs.load()
  console.log('[NSFW] Model ready.')
  return _model
}

/**
 * Checks whether the given File object contains NSFW content.
 *
 * @param {File} file  - The image file chosen by the picker
 * @returns {Promise<boolean>}  true = NSFW (block), false = clean (allow)
 */
export async function checkNsfw(file) {
  const model = await getNsfwModel()

  // Draw the file into an off-screen <img> element so nsfwjs can classify it.
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Could not load image for NSFW check.'))
      el.src = url
    })

    const predictions = await model.classify(img)
    // predictions = [{ className: 'Neutral', probability: 0.95 }, …]

    const byClass = Object.fromEntries(
      predictions.map(({ className, probability }) => [className, probability])
    )

    const porn = byClass['Porn'] ?? 0
    const hentai = byClass['Hentai'] ?? 0
    const sexy = byClass['Sexy'] ?? 0

    const isNsfw =
      porn >= PORN_THRESHOLD ||
      hentai >= PORN_THRESHOLD ||
      sexy >= SEXY_THRESHOLD

    console.log(
      `[NSFW] Porn=${porn.toFixed(2)} Hentai=${hentai.toFixed(2)} Sexy=${sexy.toFixed(2)} → ${isNsfw ? 'BLOCKED' : 'OK'}`
    )

    return isNsfw
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Call this as early as possible (e.g. when the picker's turn begins) to
 * pre-load the model so it's ready by the time the picker hits Lock Crop.
 */
export async function warmUpNsfw() {
  await getNsfwModel()
}