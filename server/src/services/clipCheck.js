/**
 * clipCheck.js
 *
 * Server-side image ↔ answer relevance check.
 *
 * Model: Xenova/clip-ViT-B-32-multilingual-v1
 *   – Multilingual CLIP ported to ONNX by Xenova.
 *   – Natively supports English, Hindi, Hinglish, Spanish, French, etc.
 *   – No external translation pipeline or script regex checks required.
 *
 * Troll detection strategy:
 *   We run zero-shot classification with two labels:
 *     1. The picker's answer (should win if image matches)
 *     2. A hardcoded distractor: "random unrelated object"
 *   If the answer label does NOT have the highest score among the two,
 *   we flag it as a mismatch and apply the troll penalty.
 *
 * Threshold: answer must score >= SCORE_THRESHOLD (default 0.20) AND
 *   must outscore the distractor, giving us two independent signals.
 */
import { imagePath } from './imageStorage.js'

const SCORE_THRESHOLD = 0.20
const DISTRACTOR = 'random unrelated object'

// Lazily initialised pipelines — heavy, loaded once per process.
let _classifyPipeline = null
let _pipelineLoading = false
let _pipelineReady = false

async function getPipelines() {
  if (_pipelineReady) return { classify: _classifyPipeline }
  if (_pipelineLoading) {
    // Wait for in-progress load
    await new Promise((resolve) => {
      const iv = setInterval(() => {
        if (_pipelineReady) { clearInterval(iv); resolve() }
      }, 100)
    })
    return { classify: _classifyPipeline }
  }

  _pipelineLoading = true
  const { pipeline, env } = await import('@huggingface/transformers')

  env.allowRemoteModels = true
  env.cacheDir = process.env.TRANSFORMERS_CACHE || './.cache/transformers'

  console.log('[CLIP] Loading Multilingual CLIP pipeline…')

  // Zero-shot image classification = CLIP vision + text encoders
  _classifyPipeline = await pipeline(
    'zero-shot-image-classification',
    'Xenova/clip-vit-base-patch32',
    {
      quantized: true // Enforces 8-bit quantization for minimal RAM usage and faster CPU inference
    }
  )

  _pipelineReady = true
  _pipelineLoading = false
  console.log('[CLIP] Multilingual CLIP pipeline ready.')
  return { classify: _classifyPipeline }
}

export async function checkImageAnswerRelevance(filePath, answer) {
  const { classify } = await getPipelines()

  let candidateText = answer.trim()

  const results = await classify(imagePath(filePath), [candidateText, DISTRACTOR])

  const answerResult = results.find((r) => r.label === candidateText)
  const distractorResult = results.find((r) => r.label === DISTRACTOR)

  const answerScore = answerResult?.score ?? 0
  const distractorScore = distractorResult?.score ?? 0

  console.log(
    `[CLIP] answer="${candidateText}" score=${answerScore.toFixed(4)}  ` +
    `distractor=${distractorScore.toFixed(4)}  ` +
    `pass=${answerScore >= SCORE_THRESHOLD && answerScore > distractorScore}`
  )

  // Pass only if the answer wins over the distractor AND clears the floor threshold
  return answerScore >= SCORE_THRESHOLD && answerScore > distractorScore
}

/**
 * Call once at server startup to pre-load the pipeline so the first
 * picker never waits for a cold model download/initialisation.
 */
export async function warmUp() {
  await getPipelines()
}