import { createHmac, timingSafeEqual } from 'node:crypto'

const SECRET = process.env.IMAGE_TOKEN_SECRET || 'dev-secret-change-me'

const TOKEN_TTL_MS = 10 * 60 * 1000

export function signImageToken(filename) {
  const exp = Date.now() + TOKEN_TTL_MS
  const payload = `${filename}|${exp}`
  const signature = createHmac('sha256', SECRET).update(payload).digest('hex')
  return Buffer.from(`${payload}|${signature}`).toString('base64url')
}

export function verifyImageToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const parts = decoded.split('|')
    if (parts.length !== 3) return null
    const [filename, expStr, signature] = parts

    const exp = Number(expStr)
    if (!filename || !exp || Date.now() > exp) return null

    const expectedSignature = createHmac('sha256', SECRET)
      .update(`${filename}|${exp}`)
      .digest('hex')

    const provided = Buffer.from(signature)
    const expected = Buffer.from(expectedSignature)
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return null
    }

    return filename
  } catch {
    return null
  }
}