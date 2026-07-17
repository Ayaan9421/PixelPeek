import { getRoom } from '../rooms/roomStore.js'
import { findRoomCodeForSocket, findPlayerBySocket } from './socketUtils.js'

const CHAT_MAX_LEN = 200

// Scoring constants
const BASE_MAX = 300

export function registerChatHandlers(io, socket) {
  socket.on('send-chat-message', ({ text } = {}, callback) => {
    if (typeof callback !== 'function') callback = () => { }

    const roomCode = findRoomCodeForSocket(socket)
    const room = roomCode && getRoom(roomCode)

    if (!room) return callback({ ok: false, error: 'Room not found.' })

    const player = findPlayerBySocket(room, socket.id)
    if (!player) return callback({ ok: false, error: 'Player not found.' })

    const trimmed = (text || '').trim().slice(0, CHAT_MAX_LEN)
    if (!trimmed) return callback({ ok: false, error: 'Message cannot be empty.' })

    const isPicker = room.pickerUuid === player.uuid
    const alreadySolved = !isPicker && room.chatState.correctGuessers.has(player.uuid)

    const entry = buildChatEntry(room, player, trimmed, isPicker, alreadySolved)

    // If this was a correct guess, score the player and emit player-guessed
    if (entry.type === 'correct-guess') {
      const pts = computeGuesserPoints(room)
      player.score += pts
      // Store per-round score earned for the round-end overlay
      if (!room.chatState.roundScores) room.chatState.roundScores = {}
      room.chatState.roundScores[player.uuid] = { name: player.name, pts }

      // Only broadcast uuid — pts are revealed at round-reveal, not during guessing
      io.to(room.code).emit('player-guessed', {
        playerUuid: player.uuid,
      })
    }

    broadcastChatEntry(io, room, entry, alreadySolved)
    callback({ ok: true })
  })
}

// Compute points for a correct guess based on time, reveal, hints, and rank.
function computeGuesserPoints(room) {
  const now = Date.now()
  const guessTimeSec = room.settings.guessTimeSec
  const guessTimeMs = guessTimeSec * 1000
  const elapsed = now - (room.roundDeadline - guessTimeMs)
  const timeRatio = Math.max(0, Math.min(1, elapsed / guessTimeMs))

  // timeFactor: 1.0 at start, 0.2 at end (linear decay)
  const timeFactor = 1.0 - (0.8 * timeRatio)

  // revealFactor: based on expansionsUsed (0 expansions = 1.0, maxExpansions = 0.5)
  const maxExp = room.currentImage?.maxExpansions ?? 2
  const expansionsUsed = room.currentImage?.expansionsUsed ?? 0
  const revealRatio = maxExp > 0 ? expansionsUsed / maxExp : 0
  const revealFactor = 1.0 - (0.5 * revealRatio)

  // hintFactor: based on hints revealed (0 hints = 1.0, numHints hints = 0.7)
  const numHints = room.settings.numHints ?? 0
  const hintsRevealed = room.revealedHints?.length ?? 0
  const hintRatio = numHints > 0 ? hintsRevealed / numHints : 0
  const hintFactor = 1.0 - (0.3 * hintRatio)

  // rankFactor: 1st guesser = 1.0, each subsequent -0.1, floor 0.5
  const rank = room.chatState.correctGuessers.size // already added this player
  const rankFactor = Math.max(0.5, 1.0 - (rank - 1) * 0.1)

  const pts = Math.round(BASE_MAX * timeFactor * revealFactor * hintFactor * rankFactor)
  return Math.max(0, pts)
}

// Compute picker points after the round ends (called by gameHandlers)
export function computeAndApplyPickerPoints(room) {
  const scores = room.chatState.roundScores ?? {}
  const roundPts = Object.values(scores).map(s => s.pts)
  const totalGuessers = room.players.size - 1  // everyone except picker
  const correctGuessers = room.chatState.correctGuessers.size

  const avgPts = roundPts.length > 0
    ? roundPts.reduce((a, b) => a + b, 0) / roundPts.length
    : 0
  const participationBonus = totalGuessers > 0
    ? (correctGuessers / totalGuessers) * 20
    : 0

  const pickerPts = Math.round(avgPts + participationBonus)

  const picker = room.players.get(room.pickerUuid)
  if (picker) {
    picker.score += pickerPts
    if (!room.chatState.roundScores) room.chatState.roundScores = {}
    room.chatState.roundScores[picker.uuid] = { name: picker.name, pts: pickerPts, isPicker: true }
  }
}

// Returns the roundScores map for the current round (for round-reveal payload)
export function getRoundScores(room) {
  return room.chatState.roundScores ?? {}
}

function buildChatEntry(room, player, text, isPicker, alreadySolved) {
  const base = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    playerUuid: player.uuid,
    playerName: player.name,
  }

  const answer = room.currentAnswer
  const isMatch = answer && normalize(text) === normalize(answer)

  if (!isMatch) {
    return { ...base, type: 'message', text }
  }

  if (isPicker) {
    return { ...base, type: 'masked', text: maskWord(text) }
  }

  if (alreadySolved) {
    return { ...base, type: 'message', text }
  }

  room.chatState.correctGuessers.add(player.uuid)
  return { ...base, type: 'correct-guess', text: `${player.name} guessed the word!` }
}

function broadcastChatEntry(io, room, entry, restricted) {
  if (!restricted) {
    io.to(room.code).emit('chat-message', entry)
    return
  }

  const recipientSocketIds = []
  for (const p of room.players.values()) {
    const isRecipientPicker = p.uuid === room.pickerUuid
    const isRecipientSolved = room.chatState.correctGuessers.has(p.uuid)
    if (isRecipientPicker || isRecipientSolved) {
      recipientSocketIds.push(p.socketId)
    }
  }

  if (recipientSocketIds.length > 0) {
    io.to(recipientSocketIds).emit('chat-message', entry)
  }
}

function normalize(str) {
  return str.trim().toLowerCase()
}

function maskWord(word) {
  return '*'.repeat(word.length)
}