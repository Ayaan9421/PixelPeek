import { useEffect, useState } from 'react'
import { useRoom } from '../context/RoomContext.jsx'
import { SETTINGS_LIMITS } from '../utils/settingsLimits.js'

export default function LobbyPage() {
  const { room, you, isHost, leaveRoom, startGame, updateSettings, updateName } = useRoom()
  const [startError, setStartError] = useState(null)
  const [settingsDraft, setSettingsDraft] = useState(room?.settings ?? null)
  const [settingsError, setSettingsError] = useState(null)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [nameError, setNameError] = useState(null)

  // Keep the settings draft in sync if another client (or a race with
  // our own save) updates the room settings underneath us.
  useEffect(() => {
    if (room?.settings) setSettingsDraft(room.settings)
  }, [room?.settings])

  useEffect(() => {
    const me = room?.players.find((p) => p.uuid === you?.uuid)
    if (me) setNameDraft(me.name)
  }, [room?.players, you?.uuid])

  if (!room) return null

  function handleStart() {
    setStartError(null)
    startGame((err) => setStartError(err))
  }

  function handleSettingChange(key, value) {
    setSettingsDraft((prev) => ({ ...prev, [key]: Number(value) }))
    setSettingsSaved(false)
  }

  function handleSaveSettings() {
    setSettingsError(null)
    updateSettings(settingsDraft, (err) => setSettingsError(err))
    setSettingsSaved(true)
  }

  function handleSaveName(e) {
    e.preventDefault()
    setNameError(null)
    updateName(nameDraft, (err) => setNameError(err))
  }

  return (
    <div className="lobby-page">
      <header className="lobby-header">
        <h2>
          Room <span className="room-code">{room.code}</span>
        </h2>
        <button type="button" onClick={leaveRoom} className="leave-btn">
          Leave
        </button>
      </header>

      <p className="lobby-hint">Share this code with friends to let them join.</p>

      <form onSubmit={handleSaveName} className="name-edit-form">
        <label>
          Your name
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            maxLength={20}
          />
        </label>
        <button type="submit">Save</button>
      </form>
      {nameError && <p className="error-text">{nameError}</p>}

      {isHost ? (
        <div className="room-settings">
          <h3>Room settings</h3>
          <div className="settings-grid">
            {Object.entries(SETTINGS_LIMITS).map(([key, { min, max, label }]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={settingsDraft?.[key] ?? ''}
                  onChange={(e) => handleSettingChange(key, e.target.value)}
                />
              </label>
            ))}
          </div>
          <button type="button" onClick={handleSaveSettings} className="save-settings-btn">
            Save settings
          </button>
          {settingsSaved && !settingsError && <span className="saved-text">Saved.</span>}
          {settingsError && <p className="error-text">{settingsError}</p>}
        </div>
      ) : (
        <div className="settings-summary">
          <span>Max players: {room.settings.maxPlayers}</span>
          <span>Rounds: {room.settings.numRounds}</span>
          <span>Guess time: {room.settings.guessTimeSec}s</span>
          <span>Pick time: {room.settings.pickTimeSec}s</span>
          <span>Hints: {room.settings.numHints}</span>
        </div>
      )}

      <ul className="player-list">
        {room.players.map((player) => (
          <li key={player.uuid} className={player.connected ? '' : 'disconnected'}>
            <span>{player.name}</span>
            {player.isHost && <span className="badge">Host</span>}
            {player.uuid === you?.uuid && <span className="badge">You</span>}
            {!player.connected && <span className="badge muted">Reconnecting…</span>}
          </li>
        ))}
      </ul>

      {isHost ? (
        <>
          <button
            type="button"
            className="start-btn"
            disabled={room.players.length < 2}
            onClick={handleStart}
          >
            Start Game {room.players.length < 2 ? '(need 2+ players)' : ''}
          </button>
          {startError && <p className="error-text">{startError}</p>}
        </>
      ) : (
        <p className="waiting-text">Waiting for host to start the game…</p>
      )}
    </div>
  )
}