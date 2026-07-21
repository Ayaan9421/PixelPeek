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
          {connecting ? 'Please wait...' : 'Create Room'}
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

      <div className="info-container">
        <div className="info-box">
          <h2>About</h2>
          <p>PixelPeek is a free online multiplayer image guessing game.</p>
          <p>A normal game consists of a few rounds. Every round, one player secretly picks an image and crops it. The others have to guess what the image is as it slowly reveals itself to gain points!</p>
          <p>The person with the most points at the end of the game will be crowned the winner. Have fun!</p>
        </div>

        <div className="info-box">
          <h2>How to Play</h2>
          <ol>
            <li><strong>Create or Join:</strong> Start a room or join a friend using a 6-character code.</li>
            <li><strong>Pick and Crop:</strong> When it is your turn, upload an image, select a zoomed-in starting area, and set the secret answer.</li>
            <li><strong>Reveal:</strong> As the timer drops, choose directions to expand your image to give the guessers more hints.</li>
            <li><strong>Guess:</strong> When someone else is picking, type your guesses in the chat. The faster you guess correctly, the more points you get!</li>
          </ol>
        </div>
      </div>
    </div>
  )
}