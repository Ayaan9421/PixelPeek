import { existsSync, mkdirSync, mkdir, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')

if (!existsSync(UPLOAD_DIR)) {
  mkdir(UPLOAD_DIR, { recursive: true }, (err) => {
    if (err) console.error(err);
  })
}

export function buildImageFilename({ roomCode, playerName, roundNumber, turnNumber, playerUuid, ext }) {
  const safeName = (playerName || 'player').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'player'
  const safeExt = /^\.[a-zA-Z0-9]+$/.test(ext) ? ext : '.jpg'
  const shortUuid = playerUuid.slice(0, 6)
  return `${roomCode}_${safeName}_r${roundNumber}_t${turnNumber}_${shortUuid}${safeExt}`
}

export function imagePath(filename) {
  return path.join(UPLOAD_DIR, filename)
}

export function saveImageBuffer(filename, buffer) {
  writeFileSync(imagePath(filename), buffer)
}

export function deleteImageFile(filename) {
  if (!filename) return
  const p = imagePath(filename)
  if (existsSync(p)) {
    try {
      unlinkSync(p)
    } catch (err) {
      console.error(`failed to delete image ${filename}:`, err.message)
    }
  }
}