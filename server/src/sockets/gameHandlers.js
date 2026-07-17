import { getRoom } from '../rooms/roomStore.js'
import { serializeRoom, createChatState } from '../rooms/roomModel.js'
import { shuffle } from '../utils/shuffle.js'
import { deleteImageFile } from '../services/imageStorage.js'
import { signPermanentImageToken } from '../services/imageToken.js'
import { findRoomCodeForSocket, findPlayerBySocket } from './socketUtils.js'
import { performScheduledExpansion } from './cropHandlers.js'
import { CROP_EXPANSION } from '../config/gameDefaults.js'
import { computeAndApplyPickerPoints, getRoundScores } from './chatHandlers.js'

// Per-room phase timers (pick timer or guess timer), kept outside the
// room object so we never try to serialize a Node Timeout.
const phaseTimers = new Map() // roomCode -> Timeout

// Per-room checkpoint timers for the crop-expansion reveal mechanic.
// Separate from phaseTimers since there can be several of these live at
// once per room (one per entry in CROP_EXPANSION.checkpoints).
const expansionTimers = new Map() // roomCode -> Timeout[]

// Per-room letter-hint timers. One timeout per hint slot, firing at
// evenly-spaced intervals across the guess window.
const hintTimers = new Map() // roomCode -> Timeout[]

export function registerGameHandlers(io, socket) {
  socket.on('next-turn', (_payload, callback) => {
    if (typeof callback !== 'function') callback = () => { }

    const roomCode = findRoomCodeForSocket(socket)
    const room = roomCode && getRoom(roomCode)
    if (!room) return callback({ ok: false, error: 'Room not found.' })

    const player = findPlayerBySocket(room, socket.id)
    if (!player || !player.isHost) {
      return callback({ ok: false, error: 'Only the host can advance the turn.' })
    }
    if (room.roundPhase !== 'revealing') {
      return callback({ ok: false, error: 'Not in revealing phase.' })
    }

    // Cancel the fallback timer (if any) and advance immediately
    clearRoomTimer(room.code)
    cleanupRoomImage(room)
    startNextTurn(io, room)
    callback({ ok: true })
  })

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

  scheduleExpansionCheckpoints(io, room)
  scheduleHints(io, room)

  return true
}

// Schedules one timer per entry in CROP_EXPANSION.checkpoints, firing at
// that fraction of the guess timer. Each timer applies the picker's
// currently-selected corner (or a random one if they never chose) via
// performScheduledExpansion -- there's no manual "confirm expand" step
// anymore, it just happens when the clock gets there.
function scheduleExpansionCheckpoints(io, room) {
  clearExpansionTimers(room.code)

  const guessTimeMs = room.settings.guessTimeSec * 1000
  const timers = CROP_EXPANSION.checkpoints.map((fraction, index) =>
    setTimeout(() => {
      performScheduledExpansion(io, room.code, index)
    }, Math.round(guessTimeMs * fraction))
  )
  expansionTimers.set(room.code, timers)
}

// Exported so roomHandlers can clear these alongside the phase timer if a
// room closes or empties mid-round.
export function clearExpansionTimers(roomCode) {
  const timers = expansionTimers.get(roomCode)
  if (timers) {
    timers.forEach(clearTimeout)
    expansionTimers.delete(roomCode)
  }
}

// Schedules numHints letter-reveal timeouts evenly across the guess window.
// Interval = guessTimeSec / (numHints + 1), so for 60 s / 3 hints the
// reveals fire at 15 s, 30 s, and 45 s.
// Each reveal picks a random position that hasn't been uncovered yet and
// emits 'hint-revealed' with { charIndex, letter } to the whole room.
// The hint is also stored in room.revealedHints so reconnecting players
// get the full list via serializeRoom.
function scheduleHints(io, room) {
  clearHintTimers(room.code)

  const numHints = room.settings.numHints ?? 0
  if (numHints <= 0 || !room.currentAnswer) return

  const answer = room.currentAnswer
  const guessTimeMs = room.settings.guessTimeSec * 1000
  const intervalMs = guessTimeMs / (numHints + 1)

  const timers = Array.from({ length: numHints }, (_, i) =>
    setTimeout(() => {
      revealNextHint(io, room.code)
    }, Math.round(intervalMs * (i + 1)))
  )

  hintTimers.set(room.code, timers)
}

// Picks a random unrevealed, non-space character in the answer and
// broadcasts it. No-ops if every character is already revealed.
function revealNextHint(io, roomCode) {
  const room = getRoom(roomCode)
  if (!room || room.roundPhase !== 'guessing' || !room.currentAnswer) return

  const answer = room.currentAnswer
  const alreadyRevealed = new Set(room.revealedHints.map((h) => h.charIndex))

  // Build the pool of candidate indices: non-space, not yet revealed.
  const candidates = []
  for (let i = 0; i < answer.length; i++) {
    if (answer[i] !== ' ' && !alreadyRevealed.has(i)) {
      candidates.push(i)
    }
  }

  if (candidates.length === 0) return // nothing left to reveal

  const charIndex = candidates[Math.floor(Math.random() * candidates.length)]
  const letter = answer[charIndex]
  const hint = { charIndex, letter }

  room.revealedHints.push(hint)
  io.to(roomCode).emit('hint-revealed', hint)
}

export function clearHintTimers(roomCode) {
  const timers = hintTimers.get(roomCode)
  if (timers) {
    timers.forEach(clearTimeout)
    hintTimers.delete(roomCode)
  }
}

// Exported so roomHandlers can clear a room's timer if everyone leaves
// mid-round, and so it can clean up any image left mid-round.
export function clearRoomTimer(roomCode) {
  const timer = phaseTimers.get(roomCode)
  if (timer) {
    clearTimeout(timer)
    phaseTimers.delete(roomCode)
  }
  clearHintTimers(roomCode)
}

// Clears the room's currentImage reference. Does NOT delete the file from
// disk — gallery files need to survive until the game ends. endGame calls
// deleteGalleryFiles() to clean up everything at once.
export function cleanupRoomImage(room) {
  if (room?.currentImage) {
    room.currentImage = null
  }
}

// Deletes every file that was saved to disk for this room (both the
// current in-progress image, if any, and all gallery images).
export function deleteAllRoomImages(room) {
  if (room?.currentImage?.filename) {
    deleteImageFile(room.currentImage.filename)
    room.currentImage = null
  }
  for (const entry of (room?.roundGallery ?? [])) {
    if (entry.filename) deleteImageFile(entry.filename)
  }
}

function finishGuessingPhase(io, roomCode) {
  const room = getRoom(roomCode)
  if (!room) return
  if (room.roundPhase !== 'guessing') return

  clearExpansionTimers(roomCode)
  clearHintTimers(roomCode)

  // Score the picker and capture round scores before we clear state.
  // We do this now so scores are final before we broadcast them.
  computeAndApplyPickerPoints(room)
  const roundScores = getRoundScores(room)
  const revealedAnswer = room.currentAnswer

  // Save this round's image + answer to the gallery before anything is cleared.
  if (room.currentImage && revealedAnswer) {
    const picker = room.players.get(room.pickerUuid)
    room.roundGallery.push({
      filename: room.currentImage.filename,  // kept for cleanup in deleteAllRoomImages
      token: signPermanentImageToken(room.currentImage.filename),
      answer: revealedAnswer,
      pickerName: picker?.name ?? 'Unknown',
    })
  }

  // Transition to 'revealing' phase so the client knows to show the full
  // image. We keep currentImage alive so clients can render it.
  room.roundPhase = 'revealing'

  // Emit round-reveal with the full image still attached, plus scoring data.
  // The room stays in 'revealing' until the host fires 'next-turn'.
  io.to(roomCode).emit('round-reveal', {
    ...serializeRoom(room),
    roundScores,
    revealedAnswer,
  })
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
  room.currentAnswer = null
  room.chatState = createChatState()
  room.revealedHints = []
  cleanupRoomImage(room)

  io.to(room.code).emit('round-started', serializeRoom(room))
  io.to(room.code).emit('chat-cleared')

  clearRoomTimer(room.code)
  clearExpansionTimers(room.code)
  clearHintTimers(room.code)
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

// Called when the CLIP check decides the picker is trolling.
// Picker loses 10% of their score; everyone else gets +5 flat consolation.
// Broadcasts 'troll-penalty' so the client can show a toast/banner,
// then auto-advances the turn after 3 s so the room isn't stuck.
export function applyTrollPenalty(io, room, pickerUuid) {
  for (const player of room.players.values()) {
    if (player.uuid === pickerUuid) {
      player.score = Math.max(0, player.score - player.score * 0.05)
    } else {
      player.score += (player.score * 0.05)
    }
  }
  io.to(room.code).emit('troll-penalty', {
    pickerUuid,
    ...serializeRoom(room),
  })
  setTimeout(() => {
    startNextTurn(io, room)
  }, 3000)
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
  deleteAllRoomImages(room)
  clearRoomTimer(room.code)
  clearExpansionTimers(room.code)
  clearHintTimers(room.code)
  io.to(room.code).emit('game-ended', {
    ...serializeRoom(room),
    roundGallery: room.roundGallery ?? [],
  })
}