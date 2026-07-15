import { randomUUID } from 'node:crypto'
import { createRoom, getRoom, deleteRoom, hasRoom } from '../rooms/roomStore.js'
import { createRoomState, createPlayer, serializeRoom } from '../rooms/roomModel.js'
import { generateUniqueRoomCode } from '../utils/roomCode.js'
import { normalizeSettings, RECONNECT_GRACE_MS } from '../config/gameDefaults.js'
import { clearRoomTimer, cleanupRoomImage } from './gameHandlers.js'
import { findRoomCodeForSocket, findPlayerBySocket } from './socketUtils.js'

const socketToRoom = new Map()

export function registerRoomHandlers(io, socket) {
        socket.on('create-room', ({ playerName, settings } = {}, callback) => {
                if (typeof callback !== 'function') return

                const name = (playerName || '').trim().slice(0, 20)
                if (!name) {
                        return callback({ ok: false, error: 'Player name is required.' })
                }

                const code = generateUniqueRoomCode(hasRoom)
                const hostUuid = randomUUID()
                const normalizedSettings = normalizeSettings(settings)

                const room = createRoomState({ code, hostUuid, settings: normalizedSettings })
                const host = createPlayer({
                        uuid: hostUuid,
                        name,
                        socketId: socket.id,
                        isHost: true,
                })
                room.players.set(hostUuid, host)
                createRoom(code, room)

                socket.join(code)
                socketToRoom.set(socket.id, { roomCode: code, uuid: hostUuid })

                callback({ ok: true, room: serializeRoom(room), you: { uuid: hostUuid } })
        })

        socket.on('join-room', ({ roomCode, playerName, uuid } = {}, callback) => {
                if (typeof callback !== 'function') return

                const code = (roomCode || '').trim().toUpperCase()
                const room = getRoom(code)
                if (!room) {
                        return callback({ ok: false, error: 'Room not found.' })
                }
                if (room.status !== 'lobby') {
                        return callback({ ok: false, error: 'Game already in progress.' })
                }

                if (uuid && room.players.has(uuid)) {
                        const existing = room.players.get(uuid)
                        if (existing.disconnectTimer) {
                                clearTimeout(existing.disconnectTimer)
                                existing.disconnectTimer = null
                        }
                        existing.connected = true
                        existing.disconnectedAt = null
                        existing.socketId = socket.id

                        socket.join(code)
                        socketToRoom.set(socket.id, { roomCode: code, uuid })

                        io.to(code).emit('room-updated', serializeRoom(room))
                        return callback({ ok: true, room: serializeRoom(room), you: { uuid }, reconnected: true })
                }

                const name = (playerName || '').trim().slice(0, 20)
                if (!name) {
                        return callback({ ok: false, error: 'Player name is required.' })
                }
                if (room.players.size >= room.settings.maxPlayers) {
                        return callback({ ok: false, error: 'Room is full.' })
                }

                const newUuid = randomUUID()
                const player = createPlayer({ uuid: newUuid, name, socketId: socket.id })
                room.players.set(newUuid, player)

                socket.join(code)
                socketToRoom.set(socket.id, { roomCode: code, uuid: newUuid })

                io.to(code).emit('room-updated', serializeRoom(room))
                callback({ ok: true, room: serializeRoom(room), you: { uuid: newUuid } })
        })

        socket.on('update-settings', ({ settings } = {}, callback) => {
                if (typeof callback !== 'function') callback = () => { }

                const roomCode = findRoomCodeForSocket(socket)
                const room = roomCode && getRoom(roomCode)
                if (!room) return callback({ ok: false, error: 'Room not found.' })

                const player = findPlayerBySocket(room, socket.id)
                if (!player || !player.isHost) {
                        return callback({ ok: false, error: 'Only the host can change settings.' })
                }
                if (room.status !== 'lobby') {
                        return callback({ ok: false, error: 'Cannot change settings after the game has started.' })
                }

                room.settings = normalizeSettings(settings)
                io.to(room.code).emit('room-updated', serializeRoom(room))
                callback({ ok: true, room: serializeRoom(room) })
        })

        socket.on('update-name', ({ name } = {}, callback) => {
                if (typeof callback !== 'function') callback = () => { }

                const roomCode = findRoomCodeForSocket(socket)
                const room = roomCode && getRoom(roomCode)
                if (!room) return callback({ ok: false, error: 'Room not found.' })

                const player = findPlayerBySocket(room, socket.id)
                if (!player) return callback({ ok: false, error: 'Player not found.' })
                if (room.status !== 'lobby') {
                        return callback({ ok: false, error: 'Cannot change name after the game has started.' })
                }

                const trimmed = (name || '').trim().slice(0, 20)
                if (!trimmed) return callback({ ok: false, error: 'Name cannot be empty.' })

                player.name = trimmed
                io.to(room.code).emit('room-updated', serializeRoom(room))
                callback({ ok: true })
        })

        socket.on('leave-room', () => {
                handleDeparture(io, socket, { immediate: true })
        })

        socket.on('disconnect', () => {
                handleDeparture(io, socket, { immediate: false })
        })
}

function handleDeparture(io, socket, { immediate }) {
        const location = socketToRoom.get(socket.id)
        if (!location) return
        socketToRoom.delete(socket.id)

        const { roomCode, uuid } = location
        const room = getRoom(roomCode)
        if (!room) return

        const player = room.players.get(uuid)
        if (!player) return

        socket.leave(roomCode)

        if (immediate) {
                room.players.delete(uuid)
                promoteHostIfNeeded(room)
                cleanupOrBroadcast(io, room)
                return
        }

        player.connected = false
        player.disconnectedAt = Date.now()
        player.disconnectTimer = setTimeout(() => {
                const stillRoom = getRoom(roomCode)
                if (!stillRoom) return
                const stillPlayer = stillRoom.players.get(uuid)
                if (stillPlayer && !stillPlayer.connected) {
                        stillRoom.players.delete(uuid)
                        promoteHostIfNeeded(stillRoom)
                        cleanupOrBroadcast(io, stillRoom)
                }
        }, RECONNECT_GRACE_MS)

        io.to(roomCode).emit('room-updated', serializeRoom(room))
}

function promoteHostIfNeeded(room) {
        if (room.players.has(room.hostUuid)) return
        const next = room.players.values().next().value
        if (next) {
                next.isHost = true
                room.hostUuid = next.uuid
        }
}

function cleanupOrBroadcast(io, room) {
        if (room.players.size === 0) {
                clearRoomTimer(room.code)
                cleanupRoomImage(room)
                deleteRoom(room.code)
                return
        }
        io.to(room.code).emit('room-updated', serializeRoom(room))
}