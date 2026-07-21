import { pipeline, env } from '@huggingface/transformers'

env.allowRemoteModels = true
env.cacheDir = process.env.TRANSFORMERS_CACHE || './.cache/transformers'
console.log('Downloading CLIP model...')


await pipeline(
  'zero-shot-image-classification',
  'Xenova/clip-vit-base-patch32',
  {
    quantized: true,
  }
)

console.log('Model downloaded successfully!')