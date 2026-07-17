import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { getRoom } from '../rooms/roomStore.js'
import { buildImageFilename, saveImageBuffer, imagePath, deleteImageFile } from '../services/imageStorage.js'
import { signImageToken, verifyImageToken } from '../services/imageToken.js'
import { handleImageLocked, applyTrollPenalty } from '../sockets/gameHandlers.js'
import { IMAGE_LIMITS } from '../config/gameDefaults.js'
import { checkImageAnswerRelevance } from '../services/clipCheck.js'

const router = Router()

const ANSWER_MAX_LEN = 40

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: IMAGE_LIMITS.maxBytes },
  fileFilter: (req, file, cb) => {
    cb(null, IMAGE_LIMITS.allowedMimeTypes.includes(file.mimetype))
  },
})

router.post('/upload-image', upload.single('image'), async (req, res) => {
  const io = req.app.get('io')
  const { roomCode, playerUuid, cropX, cropY, cropWidth, cropHeight, naturalWidth, naturalHeight, answer } = req.body

  if (!req.file) {
    return res.status(400).json({ ok: false, error: 'Image file is required.' })
  }

  const room = getRoom((roomCode || '').toUpperCase())
  if (!room) {
    return res.status(404).json({ ok: false, error: 'Room not found.' })
  }
  if (room.roundPhase !== 'picking' || room.pickerUuid !== playerUuid) {
    return res.status(403).json({ ok: false, error: 'Not your turn to pick.' })
  }

  const picker = room.players.get(playerUuid)
  if (!picker) {
    return res.status(403).json({ ok: false, error: 'Player not in room.' })
  }

  const trimmedAnswer = (answer || '').trim().slice(0, ANSWER_MAX_LEN)
  if (!trimmedAnswer) {
    return res.status(400).json({ ok: false, error: 'You must enter the answer for your image.' })
  }
  if (!/[a-zA-Z]/.test(trimmedAnswer)) {
    return res.status(400).json({ ok: false, error: 'Answer must contain at least one letter.' })
  }

  const crop = {
    x: Number(cropX),
    y: Number(cropY),
    width: Number(cropWidth),
    height: Number(cropHeight),
  }
  const naturalW = Number(naturalWidth)
  const naturalH = Number(naturalHeight)
  if (
    !Number.isFinite(crop.x) || !Number.isFinite(crop.y) ||
    !Number.isFinite(crop.width) || crop.width <= 0 ||
    !Number.isFinite(crop.height) || crop.height <= 0 ||
    !Number.isFinite(naturalW) || !Number.isFinite(naturalH)
  ) {
    return res.status(400).json({ ok: false, error: 'Invalid crop data.' })
  }

  const ext = path.extname(req.file.originalname) || '.jpg'
  const filename = buildImageFilename({
    roomCode: room.code,
    playerName: picker.name,
    roundNumber: room.currentRound,
    turnNumber: room.currentPickerIndex + 1,
    playerUuid,
    ext,
  })

  saveImageBuffer(filename, req.file.buffer)

  // ── AI relevance check (CLIP) ──────────────────────────────────────────
  // Only runs when the host has enabled it in room settings.
  if (room.settings.enableClipCheck) {
    try {
      const relevant = await checkImageAnswerRelevance(filename, trimmedAnswer)
      if (!relevant) {
        deleteImageFile(filename)
        // Penalise the troll picker and tell everyone what happened.
        applyTrollPenalty(io, room, playerUuid)
        return res.status(422).json({
          ok: false,
          error: 'Your image and answer don\'t seem to match. Round skipped.',
          trollPenalty: true,
        })
      }
    } catch (clipErr) {
      // If the model errors (e.g. first cold load), log and continue —
      // don't block the game on a model hiccup.
      console.error('[CLIP] check failed, skipping:', clipErr.message)
    }
  }

  room.currentAnswer = trimmedAnswer

  const imageInfo = {
    filename,
    token: signImageToken(filename),
    crop,
    naturalWidth: naturalW,
    naturalHeight: naturalH,
    expansionsUsed: 0,
    pendingCorner: null,
  }

  const locked = handleImageLocked(io, room.code, playerUuid, imageInfo)
  if (!locked) {
    room.currentAnswer = null
    deleteImageFile(filename)
    return res.status(409).json({ ok: false, error: 'Could not lock image (round may have already moved on).' })
  }

  res.json({ ok: true })
})

router.get('/image/:token', (req, res) => {
  const filename = verifyImageToken(req.params.token)
  if (!filename) return res.status(403).end()

  const filePath = imagePath(filename)
  if (!existsSync(filePath)) return res.status(404).end()

  res.sendFile(filePath)
})

export default router