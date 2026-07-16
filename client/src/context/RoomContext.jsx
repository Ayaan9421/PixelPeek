import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { socket, connectSocket } from '../sockets/socket.js'
import { getStoredIdentity, saveIdentity, clearIdentity } from '../utils/storage.js'

const RoomContext = createContext(null)

export function RoomProvider({ children }) {
  const [room, setRoom] = useState(null)
  const [you, setYou] = useState(null) // { uuid }
  const [error, setError] = useState(null)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    connectSocket()

    function onRoomUpdated(updatedRoom) {
      setRoom(updatedRoom)
    }

    // round-started, pick-timeout, and game-ended all carry a full,
    // serialized room snapshot — the client just replaces its copy.
    socket.on('room-updated', onRoomUpdated)
    socket.on('round-started', onRoomUpdated)
    socket.on('pick-timeout', onRoomUpdated)
    socket.on('image-locked', onRoomUpdated)
    socket.on('round-reveal', onRoomUpdated)
    socket.on('game-ended', onRoomUpdated)
    socket.on('crop-expanded', onRoomUpdated)

    // hint-revealed carries a single { charIndex, letter } rather than a
    // full room snapshot. We splice it into the existing room state so the
    // HintBar can update without a full re-sync.
    function onHintRevealed(hint) {
      setRoom((prev) => {
        if (!prev) return prev
        return { ...prev, revealedHints: [...(prev.revealedHints ?? []), hint] }
      })
    }
    socket.on('hint-revealed', onHintRevealed)

    return () => {
      socket.off('room-updated', onRoomUpdated)
      socket.off('round-started', onRoomUpdated)
      socket.off('pick-timeout', onRoomUpdated)
      socket.off('image-locked', onRoomUpdated)
      socket.off('round-reveal', onRoomUpdated)
      socket.off('game-ended', onRoomUpdated)
      socket.off('crop-expanded', onRoomUpdated)
      socket.off('hint-revealed', onHintRevealed)
    }
  }, [])

  const createRoom = useCallback((playerName, settings) => {
    setError(null)
    setConnecting(true)
    socket.emit('create-room', { playerName, settings }, (res) => {
      setConnecting(false)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setRoom(res.room)
      setYou(res.you)
      saveIdentity({ uuid: res.you.uuid, name: playerName, roomCode: res.room.code })
    })
  }, [])

  const joinRoom = useCallback((roomCode, playerName) => {
    setError(null)
    setConnecting(true)
    const stored = getStoredIdentity()
    const uuid = stored.roomCode === roomCode.toUpperCase() ? stored.uuid : undefined

    socket.emit('join-room', { roomCode, playerName, uuid }, (res) => {
      setConnecting(false)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setRoom(res.room)
      setYou(res.you)
      saveIdentity({ uuid: res.you.uuid, name: playerName, roomCode: res.room.code })
    })
  }, [])

  const leaveRoom = useCallback(() => {
    socket.emit('leave-room')
    setRoom(null)
    setYou(null)
    clearIdentity()
  }, [])

  const startGame = useCallback((onError) => {
    socket.emit('start-game', {}, (res) => {
      if (!res.ok && onError) onError(res.error)
    })
  }, [])

  const updateSettings = useCallback((settings, onError) => {
    socket.emit('update-settings', { settings }, (res) => {
      if (!res.ok && onError) onError(res.error)
    })
  }, [])

  const updateName = useCallback((name, onError) => {
    socket.emit('update-name', { name }, (res) => {
      if (!res.ok) {
        if (onError) onError(res.error)
        return
      }
      const stored = getStoredIdentity()
      saveIdentity({ uuid: stored.uuid, name, roomCode: stored.roomCode })
    })
  }, [])

  const selectExpansionCorner = useCallback((corner, onError) => {
    socket.emit('select-expansion-corner', { corner }, (res) => {
      if (!res.ok && onError) onError(res.error)
    })
  }, [])

  const value = {
    room,
    you,
    error,
    connecting,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    updateSettings,
    updateName,
    selectExpansionCorner,
    isHost: !!(room && you && room.hostUuid === you.uuid),
  }

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>
}

export function useRoom() {
  const ctx = useContext(RoomContext)
  if (!ctx) throw new Error('useRoom must be used within a RoomProvider')
  return ctx
}