import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { socket, connectSocket } from '../sockets/socket.js'
import { getStoredIdentity, saveIdentity, clearIdentity } from '../utils/storage.js'
import { playSound, preloadSounds } from '../utils/sounds.js'

const RoomContext = createContext(null)

export function RoomProvider({ children }) {
  const [room, setRoom] = useState(null)
  const [you, setYou] = useState(null)
  const [error, setError] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [correctGuessers, setCorrectGuessers] = useState(new Set())
  const [roundRevealData, setRoundRevealData] = useState(null)
  const [roundGallery, setRoundGallery] = useState([])
  const [trollBanner, setTrollBanner] = useState(null) // { pickerName } | null — kept for backward compat
  // Full data for the troll reveal screen: { pickerName, pickerUuid, scoreDeltas }
  const [trollRevealData, setTrollRevealData] = useState(null)
  const [timeoutPenaltyData, setTimeoutPenaltyData] = useState(null)
  // Scores frozen at the moment guessing starts (image-locked).
  // Displayed in the player list throughout guessing + revealing so that
  // correct-guess point additions are invisible until the round-reveal overlay.
  // Reset to null on round-started so the live scores show again in picking phase.
  const [frozenScores, setFrozenScores] = useState(null) // Map uuid -> score

  useEffect(() => {
    connectSocket()
    preloadSounds()
    function onRoomUpdated(data) {
      setRoom(data)
    }

    function onImageLocked(data) {
      // Snapshot every player's score right as guessing begins.
      const snapshot = {}
      for (const p of data.players) snapshot[p.uuid] = p.score
      setFrozenScores(snapshot)
      setRoom(data)
    }

    function onRoundStarted(data) {
      setCorrectGuessers(new Set())
      setRoundRevealData(null)
      setTrollRevealData(null)
      setFrozenScores(null) // unfreeze — picking phase shows live scores
      setTrollBanner(null)
      setTimeoutPenaltyData(null)
      setRoom(data)
      playSound('start')
    }

    function onTrollPenalty(data) {
      const pickerName = data.pickerName ?? data.players?.find((p) => p.uuid === data.pickerUuid)?.name ?? 'The picker'
      // Legacy toast banner (still used as a fallback in case trollRevealData is cleared early)
      setTrollBanner({ pickerName })
      // Rich reveal screen data
      setTrollRevealData({
        pickerName,
        pickerUuid: data.pickerUuid,
        scoreDeltas: data.scoreDeltas ?? {},
      })
      setRoom(data)
      playSound('penalty')
    }

    function onRoundReveal(data) {
      setRoundRevealData({
        roundScores: data.roundScores ?? {},
        revealedAnswer: data.revealedAnswer ?? null,
      })
      setRoom(data)
      playSound('complete')
    }

    function onHintRevealed(hint) {
      setRoom((prev) => {
        if (!prev) return prev
        return { ...prev, revealedHints: [...(prev.revealedHints ?? []), hint] }
      })
    }

    function onPlayerGuessed({ playerUuid }) {
      setCorrectGuessers((prev) => new Set([...prev, playerUuid]))
      playSound('correct')
    }

    function onGameEnded(data) {
      setRoundGallery(data.roundGallery ?? [])
      setRoundRevealData(null)
      setCorrectGuessers(new Set())
      setFrozenScores(null)
      setRoom(data)
      playSound('complete')
    }

    function onGameRestarted(data) {
      setRoundGallery([])
      setRoundRevealData(null)
      setTrollRevealData(null)
      setCorrectGuessers(new Set())
      setFrozenScores(null)
      setTrollBanner(null)
      setRoom(data.room)
      playSound('start')
    }

    function onRoomClosed() {
      socket.emit('leave-room')
      setRoom(null)
      setYou(null)
      clearIdentity()
    }

    function onPickTimeoutPenalty(data) {
      setTrollRevealData(null) // clear any previous troll screen
      setTimeoutPenaltyData(data) // ← new state
      playSound('penalty')
    }

    function onPlayerJoined(data) {
      playSound('join')
      // Optional: show a small toast "X joined the room"
    }

    function onPlayerLeft(data) {
      playSound('leave')
      // Optional: show "X left the room"
    }

    socket.on('room-updated', onRoomUpdated)
    socket.on('round-started', onRoundStarted)
    socket.on('pick-timeout', onRoomUpdated)
    socket.on('image-locked', onImageLocked)
    socket.on('round-reveal', onRoundReveal)
    socket.on('game-ended', onGameEnded)
    socket.on('game-restarted', onGameRestarted)
    socket.on('room-closed', onRoomClosed)
    socket.on('crop-expanded', onRoomUpdated)
    socket.on('hint-revealed', onHintRevealed)
    socket.on('player-guessed', onPlayerGuessed)
    socket.on('troll-penalty', onTrollPenalty)
    socket.on('pick-timeout-penalty', onPickTimeoutPenalty)
    socket.on('player-joined', onPlayerJoined)
    socket.on('player-left', onPlayerLeft)
    return () => {
      socket.off('room-updated', onRoomUpdated)
      socket.off('round-started', onRoundStarted)
      socket.off('pick-timeout', onRoomUpdated)
      socket.off('image-locked', onImageLocked)
      socket.off('round-reveal', onRoundReveal)
      socket.off('game-ended', onGameEnded)
      socket.off('game-restarted', onGameRestarted)
      socket.off('room-closed', onRoomClosed)
      socket.off('crop-expanded', onRoomUpdated)
      socket.off('hint-revealed', onHintRevealed)
      socket.off('player-guessed', onPlayerGuessed)
      socket.off('troll-penalty', onTrollPenalty)
      socket.off('pick-timeout-penalty', onPickTimeoutPenalty)
      socket.off('player-joined', onPlayerJoined)
      socket.off('player-left', onPlayerLeft)
    }
  }, [])

  const createRoom = useCallback((playerName, settings) => {
    setError(null)
    setConnecting(true)
    socket.emit('create-room', { playerName, settings }, (res) => {
      setConnecting(false)
      if (!res.ok) { setError(res.error); return }
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
      if (!res.ok) { setError(res.error); return }
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
      if (!res.ok) { if (onError) onError(res.error); return }
      const stored = getStoredIdentity()
      saveIdentity({ uuid: stored.uuid, name, roomCode: stored.roomCode })
    })
  }, [])

  const selectExpansionCorner = useCallback((corner, onError) => {
    socket.emit('select-expansion-corner', { corner }, (res) => {
      if (!res.ok && onError) onError(res.error)
    })
  }, [])

  const advanceTurn = useCallback((onError) => {
    socket.emit('next-turn', {}, (res) => {
      if (!res.ok && onError) onError(res.error)
    })
  }, [])

  const newGame = useCallback((onError) => {
    socket.emit('new-game', {}, (res) => {
      if (!res.ok && onError) onError(res.error)
    })
  }, [])

  const endRoom = useCallback((onError) => {
    socket.emit('end-room', {}, (res) => {
      if (!res.ok && onError) onError(res.error)
      else {
        setRoom(null)
        setYou(null)
        clearIdentity()
      }
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
    correctGuessers,
    roundRevealData,
    frozenScores,
    roundGallery,
    advanceTurn,
    newGame,
    endRoom,
    trollBanner,
    trollRevealData,
    timeoutPenaltyData,
    isHost: !!(room && you && room.hostUuid === you.uuid),
  }

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>
}

export function useRoom() {
  const ctx = useContext(RoomContext)
  if (!ctx) throw new Error('useRoom must be used within a RoomProvider')
  return ctx
}