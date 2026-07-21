import { useState } from 'react'
import { useRoom } from '../context/RoomContext.jsx'
import '../styles/HomePage.css'

export default function HomePage() {
  const { createRoom, joinRoom, error, connecting } = useRoom()
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')

  function handleCreate(e) {
    e.preventDefault()
    createRoom(playerName)
  }

  function handleJoin(e) {
    e.preventDefault()
    joinRoom(roomCode, playerName)
  }

  return (
    <div className="home-page">
      <img src="/images/logo.png" alt="Pixel Peek" className="home-logo" />

      <form className="home-card" onSubmit={handleCreate}>
        <input
          className="name-input"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength={20}
          required
          placeholder="Enter your nickname..."
        />

        <button type="submit" className="btn btn-create" disabled={connecting}>
          {connecting ? 'Please wait…' : 'Create Room'}
        </button>

        <button
          type="button"
          className="btn btn-join"
          disabled={connecting}
          onClick={handleJoin}
        >
          Join Room
        </button>

        <label className="code-label" htmlFor="room-code">
          6-character room code (e.g., ABCD12)
        </label>
        <input
          id="room-code"
          className="code-input"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="Enter Code"
        />
        {error && <p className="error-text">{error}</p>}
      </form>
    </div>
  )
}