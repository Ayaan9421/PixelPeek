import { useState } from 'react'
import { useRoom } from '../context/RoomContext.jsx'
import { SETTINGS_LIMITS } from '../utils/settingsLimits.js'

const DEFAULT_SETTINGS = Object.fromEntries(
  Object.entries(SETTINGS_LIMITS).map(([key, { default: def }]) => [key, def])
)

export default function HomePage() {
  const { createRoom, joinRoom, error, connecting } = useRoom()
  const [mode, setMode] = useState('create') // 'create' | 'join'
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)

  function updateSetting(key, value) {
    setSettings((prev) => ({ ...prev, [key]: Number(value) }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (mode === 'create') {
      createRoom(playerName, settings)
    } else {
      joinRoom(roomCode, playerName)
    }
  }

  return (
    <div className="home-page">
      <h1>Guess The Crop</h1>
      <p className="tagline">Guess the image before the reveal finishes.</p>

      <div className="mode-toggle">
        <button
          type="button"
          className={mode === 'create' ? 'active' : ''}
          onClick={() => setMode('create')}
        >
          Create Room
        </button>
        <button
          type="button"
          className={mode === 'join' ? 'active' : ''}
          onClick={() => setMode('join')}
        >
          Join Room
        </button>
      </div>

      <form onSubmit={handleSubmit} className="home-form">
        <label>
          Your name
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
            required
            placeholder="e.g. Wraith"
          />
        </label>

        {mode === 'join' && (
          <label>
            Room code
            <input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
              placeholder="ABCD12"
            />
          </label>
        )}

        {mode === 'create' && (
          <div className="room-settings">
            <button
              type="button"
              className="settings-toggle"
              onClick={() => setShowSettings((s) => !s)}
            >
              {showSettings ? 'Hide' : 'Customize'} room settings
            </button>

            {showSettings && (
              <div className="settings-grid">
                {Object.entries(SETTINGS_LIMITS).map(([key, { min, max, label }]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="number"
                      min={min}
                      max={max}
                      value={settings[key]}
                      onChange={(e) => updateSetting(key, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={connecting}>
          {connecting ? 'Please wait…' : mode === 'create' ? 'Create Room' : 'Join Room'}
        </button>
      </form>
    </div>
  )
}
