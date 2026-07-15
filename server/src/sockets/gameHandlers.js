import { getRoom } from '../rooms/roomStore.js'
import { serializeRoom } from '../rooms/roomModel.js'
import { shuffle } from '../utils/shuffle.js'
import { deleteImageFile } from '../services/imageStorage.js'
import { findRoomCodeForSocket, findPlayerBySocket } from './socketUtils.js'

// Per-room phase timers (pick timer or guess timer), kept outside the
// room object so we never try to serialize a Node Timeout.
const phaseTimers = new Map() // roomCode -> Timeout

export function registerGameHandlers(io, socket) {
  socket.on('start-game', (_payload, callback) => {
    if (typeof callback !== 'function') callback = () => { }

    const roomCode = findRoomCodeForSocket(socket)
    const room = roomCode && getRoom(roomCode)
    if (!room) return callback({ ok: false, error: 'Room not found.' })

    const player = findPlayerBySocket(room, socket.id)
    if (!player || !player.isHost) {
      return callback({ ok: false, error: 'Only the host can start the game.' })
    }
    if (room.status !== 'lobby') {
      return callback({ ok: false, error: 'Game already started.' })
    }
    if (room.players.size < 2) {
      return callback({ ok: false, error: 'Need at least 2 players.' })
    }

    room.status = 'playing'
    room.currentRound = 1
    room.pickerOrder = shuffle(Array.from(room.players.keys()))
    room.currentPickerIndex = -1

    callback({ ok: true })
    startNextTurn(io, room)
  })
}

// Called by the HTTP upload route once an image has been saved to disk
// for the current picker. Transitions picking -> guessing.
export function handleImageLocked(io, roomCode, pickerUuid, imageInfo) {
  const room = getRoom(roomCode)
  if (!room) return false
  if (room.roundPhase !== 'picking' || room.pickerUuid !== pickerUuid) return false

  clearRoomTimer(room.code)
  room.currentImage = imageInfo
  room.roundPhase = 'guessing'
  room.roundDeadline = Date.now() + room.settings.guessTimeSec * 1000

  io.to(room.code).emit('image-locked', serializeRoom(room))

  const timer = setTimeout(() => {
    finishGuessingPhase(io, room.code)
  }, room.settings.guessTimeSec * 1000)
  phaseTimers.set(room.code, timer)

  return true
}

// Exported so roomHandlers can clear a room's timer if everyone leaves
// mid-round, and so it can clean up any image left mid-round.
export function clearRoomTimer(roomCode) {
  const timer = phaseTimers.get(roomCode)
  if (timer) {
    clearTimeout(timer)
    phaseTimers.delete(roomCode)
  }
}

export function cleanupRoomImage(room) {
  if (room?.currentImage?.filename) {
    deleteImageFile(room.currentImage.filename)
    room.currentImage = null
  }
}

function finishGuessingPhase(io, roomCode) {
  const room = getRoom(roomCode)
  if (!room) return
  if (room.roundPhase !== 'guessing') return

  cleanupRoomImage(room)
  io.to(roomCode).emit('round-reveal', serializeRoom(room))

  startNextTurn(io, room)
}

function startNextTurn(io, room) {
  const nextPickerUuid = advancePicker(room)

  if (!nextPickerUuid) {
    endGame(io, room)
    return
  }

  room.pickerUuid = nextPickerUuid
  room.roundPhase = 'picking'
  room.roundDeadline = Date.now() + room.settings.pickTimeSec * 1000
  cleanupRoomImage(room)

  io.to(room.code).emit('round-started', serializeRoom(room))

  clearRoomTimer(room.code)
  const timer = setTimeout(() => {
    handlePickTimeout(io, room.code)
  }, room.settings.pickTimeSec * 1000)
  phaseTimers.set(room.code, timer)
}

// Walks pickerOrder starting after the current index, skipping anyone
// who has left the room. A "round" completes (currentRound += 1) each
// time the walk wraps back to the start of pickerOrder -- i.e. once
// every player who was present at game start has had a turn.
// Returns null once currentRound exceeds settings.numRounds, or if
// every player in pickerOrder has left.
function advancePicker(room) {
  const total = room.pickerOrder.length
  if (total === 0) return null

  let attempts = 0
  while (attempts < total) {
    room.currentPickerIndex += 1
    attempts += 1

    if (room.currentPickerIndex >= total) {
      room.currentPickerIndex = 0
      room.currentRound += 1
      if (room.currentRound > room.settings.numRounds) return null
    }

    const candidate = room.pickerOrder[room.currentPickerIndex]
    if (room.players.has(candidate)) return candidate
  }

  return null // everyone in pickerOrder has left
}

function handlePickTimeout(io, roomCode) {
  const room = getRoom(roomCode)
  if (!room) return
  if (room.roundPhase !== 'picking') return // image was already locked in the meantime

  applyPickTimeoutPenalty(room)
  io.to(roomCode).emit('pick-timeout', serializeRoom(room))

  startNextTurn(io, room)
}

// Picker missed their window: -1% of their own score.
// Everyone else: +1% of their own score.
function applyPickTimeoutPenalty(room) {
  for (const player of room.players.values()) {
    if (player.uuid === room.pickerUuid) {
      player.score = player.score - player.score * 0.01
    } else {
      player.score = player.score + player.score * 0.01
    }
  }
}

function endGame(io, room) {
  room.status = 'ended'
  room.roundPhase = null
  room.roundDeadline = null
  room.pickerUuid = null
  cleanupRoomImage(room)
  clearRoomTimer(room.code)
  io.to(room.code).emit('game-ended', serializeRoom(room))
}