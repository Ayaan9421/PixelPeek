import { getRoom } from '../rooms/roomStore.js'
import { findRoomCodeForSocket, findPlayerBySocket } from './socketUtils.js'

const CHAT_MAX_LEN = 200

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
    // "Already solved" = this player guessed correctly earlier this round.
    // Their messages from here on are private to the solved group (see
    // broadcastChatEntry) instead of being masked, so they can chat freely
    // post-guess without spoiling anything for players still guessing.
    const alreadySolved = !isPicker && room.chatState.correctGuessers.has(player.uuid)

    const entry = buildChatEntry(room, player, trimmed, isPicker, alreadySolved)
    broadcastChatEntry(io, room, entry, alreadySolved)
    callback({ ok: true })
  })
}

// Builds the chat entry, applying the answer-guess rules:
// - Not a match (or no answer set yet) -> plain message.
// - Picker types the answer in their own chat -> masked for everyone.
//   The picker already knows the word; this just stops them from
//   accidentally leaking it to guessers who haven't solved yet.
// - A guesser's first correct match -> everyone sees "<name> guessed the
//   word!" (green tile), and that guesser is remembered as "solved".
// - Anything a solved guesser sends afterwards (including saying the
//   answer again) -> sent as a normal message. No masking needed here:
//   broadcastChatEntry() below restricts who actually receives it.
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

// Delivers the chat entry to the room. Normal messages (and the initial
// "guessed the word!" reveal) go to everyone as before. Messages from a
// player who already solved the round only go to the picker and other
// players who have also already solved it -- unsolved guessers never
// receive them at all, so there's nothing to mask.
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