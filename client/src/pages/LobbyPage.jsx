import { useEffect, useState } from 'react'
import { useRoom } from '../context/RoomContext.jsx'
import { SETTINGS_LIMITS, BOOLEAN_SETTINGS } from '../utils/settingsLimits.js'
import ChatPanel from '../components/ChatPanel.jsx'

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

  function handleBooleanSettingChange(key, checked) {
    setSettingsDraft((prev) => ({ ...prev, [key]: checked }))
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

      <div className="lobby-layout">
        {/* Left / Main Content */}
        <div className="lobby-main">
          {/* Name edit */}
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

          {/* Settings */}
          {isHost ? (
            <div className="room-settings"> {/* your settings code */} </div>
          ) : (
            <div className="settings-summary"> {/* your summary */} </div>
          )}

          {/* Players */}
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

          {/* Start Button */}
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

        {/* Chat Panel */}
        <div className="lobby-chat-panel">
          <h3>Chat</h3>
          <ChatPanel />   {/* Reuse your existing component */}
        </div>
      </div>
    </div>
  )
}