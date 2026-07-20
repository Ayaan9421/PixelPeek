// import { useEffect, useState } from 'react'
// import { useRoom } from '../context/RoomContext.jsx'
// import { SETTINGS_LIMITS, BOOLEAN_SETTINGS } from '../utils/settingsLimits.js'
// import ChatPanel from '../components/ChatPanel.jsx'

// export default function LobbyPage() {
//   const { room, you, isHost, leaveRoom, startGame, updateSettings, updateName } = useRoom()
//   const [startError, setStartError] = useState(null)
//   const [settingsDraft, setSettingsDraft] = useState(room?.settings ?? null)
//   const [settingsError, setSettingsError] = useState(null)
//   const [settingsSaved, setSettingsSaved] = useState(false)
//   const [nameDraft, setNameDraft] = useState('')
//   const [nameError, setNameError] = useState(null)

//   // Keep the settings draft in sync if another client (or a race with
//   // our own save) updates the room settings underneath us.
//   useEffect(() => {
//     if (room?.settings) setSettingsDraft(room.settings)
//   }, [room?.settings])

//   useEffect(() => {
//     const me = room?.players.find((p) => p.uuid === you?.uuid)
//     if (me) setNameDraft(me.name)
//   }, [room?.players, you?.uuid])

//   if (!room) return null

//   function handleStart() {
//     setStartError(null)
//     startGame((err) => setStartError(err))
//   }

//   function handleSettingChange(key, value) {
//     setSettingsDraft((prev) => ({ ...prev, [key]: Number(value) }))
//     setSettingsSaved(false)
//   }

//   function handleBooleanSettingChange(key, checked) {
//     setSettingsDraft((prev) => ({ ...prev, [key]: checked }))
//     setSettingsSaved(false)
//   }

//   function handleSaveSettings() {
//     setSettingsError(null)
//     updateSettings(settingsDraft, (err) => setSettingsError(err))
//     setSettingsSaved(true)
//   }

//   function handleSaveName(e) {
//     e.preventDefault()
//     setNameError(null)
//     updateName(nameDraft, (err) => setNameError(err))
//   }

//   return (
//     <div className="lobby-page">
//       <header className="lobby-header">
//         <h2>
//           Room <span className="room-code">{room.code}</span>
//         </h2>
//         <button type="button" onClick={leaveRoom} className="leave-btn">
//           Leave
//         </button>
//       </header>

//       <p className="lobby-hint">Share this code with friends to let them join.</p>

//       <div className="lobby-layout">
//         {/* Left / Main Content */}
//         <div className="lobby-main">
//           {/* Name edit */}
//           <form onSubmit={handleSaveName} className="name-edit-form">
//             <label>
//               Your name
//               <input
//                 value={nameDraft}
//                 onChange={(e) => setNameDraft(e.target.value)}
//                 maxLength={20}
//               />
//             </label>
//             <button type="submit">Save</button>
//           </form>
//           {nameError && <p className="error-text">{nameError}</p>}

//           {/* Settings */}
//           {isHost ? (
//             <div className="room-settings"> {/* your settings code */} </div>
//           ) : (
//             <div className="settings-summary"> {/* your summary */} </div>
//           )}

//           {/* Players */}
//           <ul className="player-list">
//             {room.players.map((player) => (
//               <li key={player.uuid} className={player.connected ? '' : 'disconnected'}>
//                 <span>{player.name}</span>
//                 {player.isHost && <span className="badge">Host</span>}
//                 {player.uuid === you?.uuid && <span className="badge">You</span>}
//                 {!player.connected && <span className="badge muted">Reconnecting…</span>}
//               </li>
//             ))}
//           </ul>

//           {/* Start Button */}
//           {isHost ? (
//             <>
//               <button
//                 type="button"
//                 className="start-btn"
//                 disabled={room.players.length < 2}
//                 onClick={handleStart}
//               >
//                 Start Game {room.players.length < 2 ? '(need 2+ players)' : ''}
//               </button>
//               {startError && <p className="error-text">{startError}</p>}
//             </>
//           ) : (
//             <p className="waiting-text">Waiting for host to start the game…</p>
//           )}
//         </div>

//         {/* Chat Panel */}
//         <div className="lobby-chat-panel">
//           <h3>Chat</h3>
//           <ChatPanel />   {/* Reuse your existing component */}
//         </div>
//       </div>
//     </div>
//   )
// }

import { useEffect, useMemo, useState } from 'react'
import { useRoom } from '../context/RoomContext.jsx'
import { SETTINGS_LIMITS, BOOLEAN_SETTINGS } from '../utils/settingsLimits.js'
import ChatPanel from '../components/ChatPanel.jsx'
import { avatarForUuid } from '../utils/avatarSelection.js'
import '../styles/LobbyPage.css'

export default function LobbyPage() {
  const { room, you, isHost, leaveRoom, startGame, updateSettings, updateName } = useRoom()
  const [startError, setStartError] = useState(null)
  const [settingsDraft, setSettingsDraft] = useState(room?.settings ?? null)
  const [settingsError, setSettingsError] = useState(null)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [nameError, setNameError] = useState(null)
  const [openPanel, setOpenPanel] = useState('settings') // 'settings' | 'chat'

  // Keep the settings draft in sync if another client (or a race with
  // our own save) updates the room settings underneath us.
  useEffect(() => {
    if (room?.settings) setSettingsDraft(room.settings)
  }, [room?.settings])

  useEffect(() => {
    const me = room?.players.find((p) => p.uuid === you?.uuid)
    if (me) setNameDraft(me.name)
  }, [room?.players, you?.uuid])

  const avatarMap = useMemo(() => {
    const map = {}
    room?.players.forEach((p) => {
      map[p.uuid] = avatarForUuid(p.uuid)
    })
    return map
  }, [room?.players])

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

  const maxPlayers = room.settings?.maxPlayers ?? SETTINGS_LIMITS?.maxPlayers?.max ?? 8

  return (
    <div className="lobby-page">
      <div className="lobby-topbar">
        <h1 className="lobby-title">
          Lobby: Room <span className="room-code">{room.code}</span>
        </h1>
        <button type="button" onClick={leaveRoom} className="leave-btn">
          Leave
        </button>
      </div>

      <p className="lobby-hint">Share this code with friends to let them join.</p>

      <div className="lobby-layout">
        {/* Left: Players panel */}
        <section className="lobby-panel players-panel">
          <header className="panel-header">
            <h3>Players</h3>
            <span className="player-count">
              ({room.players.length}/{maxPlayers})
            </span>
          </header>

          <ul className="player-list">
            {room.players.map((player) => {
              const isYou = player.uuid === you?.uuid
              return (
                <li
                  key={player.uuid}
                  className={`player-row${player.connected ? '' : ' disconnected'}`}
                >
                  <span className="avatar-wrap">
                    <img
                      className="player-avatar"
                      src={`/images/icon${avatarMap[player.uuid] ?? 1}.PNG`}
                      alt=""
                    />
                  </span>

                  <div className="player-info">
                    {player.isHost && (
                      <div className="player-host">
                        <span className="crown">👑</span>
                      </div>
                    )}

                    <div className="player-name">
                      {player.name} {player.isHost && <span className="host-suffix"> (Host)</span>}
                    </div>
                  </div>
                  <span className="player-status">
                    {isYou ? (
                      <span className="status-dot status-dot--you" title="You" />
                    ) : player.connected ? (
                      <>
                        <span className="status-dot status-dot--joined" />
                        <span className="status-label">Joined</span>
                      </>
                    ) : (
                      <span className="status-label status-label--muted">Reconnecting…</span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>

          <form onSubmit={handleSaveName} className="name-edit-form">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={20}
              placeholder="Your name"
              aria-label="Your name"
            />
            <button type="submit">Save</button>
          </form>
          {nameError && <p className="error-text">{nameError}</p>}
        </section>

        {/* Right: Accordion (Game Settings / Lobby Chat) */}
        <div className="lobby-side">
          <section className={`lobby-panel accordion${openPanel === 'settings' ? ' is-open' : ''}`}>
            <button
              type="button"
              className="accordion-header"
              onClick={() => setOpenPanel((prev) => (prev === 'settings' ? 'chat' : 'settings'))}
            >
              <h3>Game Settings</h3>
              <Chevron open={openPanel === 'settings'} />
            </button>

            <div className="accordion-body">
              <div className="accordion-body-inner">
                {isHost ? (
                  <div className="room-settings">
                    <div className="settings-row">
                      {Object.entries(SETTINGS_LIMITS ?? {}).map(([key, { min, max, step, label }]) => (
                        <label key={key} className="settings-select">
                          <span>{label}:</span>
                          <input
                            type="number"
                            min={min}
                            max={max}
                            step={step}
                            value={settingsDraft?.[key] ?? min}
                            onChange={(e) => handleSettingChange(key, e.target.value)}
                          />
                        </label>
                      ))}
                    </div>

                    {BOOLEAN_SETTINGS && Object.keys(BOOLEAN_SETTINGS).length > 0 && (
                      <div className="settings-toggles">
                        {Object.entries(BOOLEAN_SETTINGS).map(([key, { label }]) => (
                          <label key={key} className="toggle-row">
                            <input
                              type="checkbox"
                              checked={!!settingsDraft?.[key]}
                              onChange={(e) => handleBooleanSettingChange(key, e.target.checked)}
                            />

                            <span className="toggle-switch">
                              <span className="toggle-knob" />
                            </span>

                            <span className="toggle-label">
                              {label}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    <button type="button" className="save-settings-btn" onClick={handleSaveSettings}>
                      {settingsSaved ? 'Saved ✓' : 'Save Settings'}
                    </button>
                    {settingsError && <p className="error-text">{settingsError}</p>}
                  </div>
                ) : (
                  <div className="settings-summary">
                    <div className="settings-row">
                      {Object.entries(SETTINGS_LIMITS ?? {}).map(([key, { label }]) => (
                        <div key={key} className="summary-item">
                          <span className="summary-label">{label}:</span> {room.settings?.[key]}
                        </div>
                      ))}
                    </div>
                    <p className="waiting-text">Waiting for host to start the game…</p>
                  </div>
                )}
              </div>
            </div>
            {isHost && (
              <button
                className="btn start-btn"
                disabled={room.players.length < 2}
                onClick={handleStart}
              >
                Start Game {room.players.length < 2 ? '(need 2+ players)' : ''}
              </button>
            )}

            {isHost && startError && <p className="error-text">{startError}</p>}
          </section>

          <section className={`lobby-panel accordion${openPanel === 'chat' ? ' is-open' : ''}`}>
            <button type="button" className="accordion-header" onClick={() => setOpenPanel((prev) => (prev === 'settings' ? 'chat' : 'settings'))}>
              <h3>Lobby Chat</h3>
              <Chevron open={openPanel === 'chat'} />
            </button>

            <div className="accordion-body">
              <div className="accordion-body-inner accordion-body-inner--chat">
                <ChatPanel />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function Chevron({ open }) {
  return (
    <svg
      className={`chevron${open ? ' chevron--open' : ''}`}
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
    >
      <path
        d="M6 10l7 7 7-7"
        stroke="#14141a"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function rangeOptions(min = 1, max = 10, step = 1) {
  const opts = []
  for (let v = min; v <= max; v += step || 1) opts.push(v)
  return opts
}