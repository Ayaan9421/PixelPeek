import { getRoom } from '../rooms/roomStore.js'
import { serializeRoom } from '../rooms/roomModel.js'
import { findRoomCodeForSocket, findPlayerBySocket } from './socketUtils.js'
import { computeExpandedCrop, isValidCorner, VALID_CORNERS } from '../utils/cropExpansion.js'
import { CROP_EXPANSION } from '../config/gameDefaults.js'

// The picker no longer triggers expansion directly. Instead they set (and
// can freely change) which corner they'd like to grow toward; the actual
// expansion happens automatically, driven by a server-side timer, the
// instant the round timer crosses each checkpoint (see
// scheduleExpansionCheckpoints in gameHandlers.js).
export function registerCropHandlers(io, socket) {
  socket.on('select-expansion-corner', ({ corner } = {}, callback) => {
    if (typeof callback !== 'function') callback = () => { }

    const roomCode = findRoomCodeForSocket(socket)
    const room = roomCode && getRoom(roomCode)
    if (!room) return callback({ ok: false, error: 'Room not found.' })

    const player = findPlayerBySocket(room, socket.id)
    if (!player || player.uuid !== room.pickerUuid) {
      return callback({ ok: false, error: 'Only the picker can choose the expansion corner.' })
    }
    if (room.roundPhase !== 'guessing' || !room.currentImage) {
      return callback({ ok: false, error: 'Not in the guessing phase.' })
    }
    if (!isValidCorner(corner)) {
      return callback({ ok: false, error: 'Invalid corner.' })
    }

    const used = room.currentImage.expansionsUsed || 0
    if (used >= CROP_EXPANSION.maxExpansions) {
      return callback({ ok: false, error: 'No expansions remaining.' })
    }

    room.currentImage.pendingCorner = corner
    callback({ ok: true })
  })
}

// Called by gameHandlers.js's checkpoint timer, exactly when the round
// timer reaches checkpoints[checkpointIndex]. Applies whatever corner the
// picker had selected (room.currentImage.pendingCorner), or a random one
// if they never picked, then broadcasts the new crop to everyone.
export function performScheduledExpansion(io, roomCode, checkpointIndex) {
  const room = getRoom(roomCode)
  if (!room) return
  if (room.roundPhase !== 'guessing' || !room.currentImage) return

  const used = room.currentImage.expansionsUsed || 0
  // Guards against a stale timer firing after the round already moved on
  // (e.g. this checkpoint was already applied, or expansions are maxed).
  if (used !== checkpointIndex || used >= CROP_EXPANSION.maxExpansions) return

  const corner = isValidCorner(room.currentImage.pendingCorner)
    ? room.currentImage.pendingCorner
    : randomCorner()

  const newCrop = computeExpandedCrop({
    crop: room.currentImage.crop,
    corner,
    naturalWidth: room.currentImage.naturalWidth,
    naturalHeight: room.currentImage.naturalHeight,
    growthFactor: CROP_EXPANSION.growthFactor,
  })

  room.currentImage.crop = newCrop
  room.currentImage.expansionsUsed = used + 1
  room.currentImage.pendingCorner = null

  io.to(room.code).emit('crop-expanded', serializeRoom(room))
}

function randomCorner() {
  return VALID_CORNERS[Math.floor(Math.random() * VALID_CORNERS.length)]
}