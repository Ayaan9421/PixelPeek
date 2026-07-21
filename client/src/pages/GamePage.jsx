import { useState, useEffect } from 'react'
import { useRoom } from '../context/RoomContext.jsx'
import { useCountdown } from '../hooks/useCountdown.js'
import CropSelector from '../components/CropSelector.jsx'
import CroppedImageView from '../components/CroppedImageView.jsx'
import CropExpansionPanel from '../components/CropExpansionPanel.jsx'
import PlayersList from '../components/PlayersList.jsx'
import ChatPanel from '../components/ChatPanel.jsx'
import HintBar from '../components/HintBar.jsx'
import FullImageView from '../components/FullImageView.jsx'
import { imageUrlFromToken } from '../utils/api.jsx'
import '../styles/GamePage.css'

export default function GamePage() {
  const {
    room, you, leaveRoom,
    correctGuessers, roundRevealData, frozenScores,
    roundGallery, advanceTurn, isHost, trollBanner,
    trollRevealData, timeoutPenaltyData,
    newGame, endRoom,
  } = useRoom()
  const secondsLeft = useCountdown(room?.roundDeadline)
  const [selectedImage, setSelectedImage] = useState(null)
  // Revealing phase: toggle between full image and scores panel
  const [revealView, setRevealView] = useState('scores') // 'image' | 'scores'

  // Reset to scores view whenever a new round reveal comes in
  useEffect(() => {
    if (roundRevealData) setRevealView('scores')
  }, [roundRevealData])

  // Game-ended screen: toggle between scoreboard and gallery
  const [endView, setEndView] = useState('scores') // 'scores' | 'gallery'

  if (!room) return null

  // ── Game over ──────────────────────────────────────────────────────────
  if (room.status === 'ended') {
    const ranked = [...room.players].sort((a, b) => b.score - a.score)

    return (
      <div className="game-page game-page--ended">
        <div className="ended-header">
          <h2 className="ended-title">Game Over</h2>

          {!isHost && (
            <button
              className="ended-leave-header"
              onClick={leaveRoom}
            >
              Leave Room
            </button>
          )}
        </div>

        <div className="ended-toggle">
          <button
            className={endView === 'scores' ? 'active' : ''}
            onClick={() => setEndView('scores')}
          >
            Scoreboard
          </button>
          <button
            className={endView === 'gallery' ? 'active' : ''}
            onClick={() => setEndView('gallery')}
          >
            View Gallery
          </button>
        </div>

        {endView === 'scores' && (
          <ol className="scoreboard">
            {ranked.map((player) => (
              <li key={player.uuid} className={player.uuid === you?.uuid ? 'you' : ''}>
                <span>{player.name}</span>
                <span>{Math.round(player.score)}</span>
              </li>
            ))}
          </ol>
        )}

        {endView === 'gallery' && (
          <div className="gallery-grid">
            {roundGallery.length === 0 && (
              <p className="gallery-empty">No images to show.</p>
            )}
            {roundGallery.map((entry, i) => (
              <div key={i} className="gallery-card">
                <img
                  src={imageUrlFromToken(entry.token)}
                  alt={entry.answer}
                  className="gallery-img"
                  crossOrigin="anonymous"
                  onClick={() => setSelectedImage(entry)}
                />
                <div className="gallery-caption">
                  <span className="gallery-answer">{entry.answer}</span>
                  <span className="gallery-picker">by {entry.pickerName}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedImage && (
          <div
            className="gallery-modal"
            onClick={() => setSelectedImage(null)}
          >
            <img
              src={imageUrlFromToken(selectedImage.token)}
              alt={selectedImage.answer}
              className="gallery-modal-image"
            />
          </div>
        )}

        {isHost && (
          <div className="ended-host-actions">
            <button
              type="button"
              className="ended-action-btn ended-action-btn--primary"
              onClick={() => newGame()}
            >
              Start New Game
            </button>
            <button
              type="button"
              className="ended-action-btn ended-action-btn--danger"
              onClick={() => endRoom()}
            >
              End Room
            </button>
          </div>
        )
        }
      </div>
    )
  }

  // ── Active game ────────────────────────────────────────────────────────
  const picker = room.players.find((p) => p.uuid === room.pickerUuid)
  const isPicker = room.pickerUuid === you?.uuid
  const isRevealing = room.roundPhase === 'revealing'

  // ── Troll reveal screen ───────────────────────────────────────────────
  // Shown after CLIP rejects the picker's image/answer combo.
  // Replaces the normal game layout until round-started clears it.
  if (trollRevealData) {
    return (
      <div className="game-page game-page--troll-reveal">
        <TrollRevealPanel trollRevealData={trollRevealData} you={you} />
      </div>
    )
  }

  // ── Pick Timeout Penalty Screen ─────────────────────────────────────────
  if (timeoutPenaltyData) {
    return (
      <div className="game-page game-page--troll-reveal">   {/* reuse same styling */}
        <TimeoutPenaltyPanel
          data={timeoutPenaltyData}
          you={you}
        />
      </div>
    )
  }

  const roundStatusText =
    room.roundPhase === 'picking'
      ? (isPicker ? 'YOU ARE THE PICKER!' : `${(picker?.name ?? '…').toUpperCase()} IS PICKING!`)
      : room.roundPhase === 'guessing'
        ? (isPicker ? 'MANAGE THE REVEAL' : `GUESS ${(picker?.name ?? '…').toUpperCase()}'S IMAGE!`)
        : 'ROUND RESULTS!'

  const phaseStatusText =
    room.roundPhase === 'picking'
      ? 'Waiting for picker…'
      : room.roundPhase === 'guessing'
        ? 'Guessing in progress…'
        : 'Round results…'

  const showCountdown = room.roundPhase === 'picking' || room.roundPhase === 'guessing'

  return (
    <div className="game-page game-page--active">
      <div className="round-heading">
        <h1 className="round-title">
          Round {room.currentRound}/{room.settings.numRounds}: <span className="round-status">{roundStatusText}</span>
        </h1>
        {showCountdown && (
          <div className="countdown-badge">
            <span className="countdown-num">{secondsLeft}</span>
            <span className="countdown-unit">s</span>
          </div>
        )}
      </div>

      <div className="game-layout">
        <aside className="players-pane">
          <div className="phase-status">{phaseStatusText}</div>
          <PlayersList
            players={room.players}
            youUuid={you?.uuid}
            pickerUuid={room.pickerUuid}
            correctGuessers={correctGuessers}
            frozenScores={frozenScores}
          />
        </aside>

        <main className="center-pane">
          {/* ── Picking phase ──────────────────────────────────── */}
          {room.roundPhase === 'picking' && (
            <div className="picking-phase">
              {isPicker ? (
                <CropSelector />
              ) : (
                <p className="hint-text">
                  {picker?.name} is choosing an image. Guessing starts once it's locked in.
                </p>
              )}
            </div>
          )}

          {/* ── Guessing phase ─────────────────────────────────── */}
          {room.roundPhase === 'guessing' && (
            <div className="guessing-phase">
              {isPicker && room.currentImage ? (
                <CropExpansionPanel
                  currentImage={room.currentImage}
                  secondsLeft={secondsLeft}
                  guessTimeSec={room.settings.guessTimeSec}
                />
              ) : (
                <>
                  <div className="image-card guessing-image-card">
                    <CroppedImageView currentImage={room.currentImage} />
                  </div>
                  <div className="answer-row hint-answer-row">
                    <div className="answer-box hint-answer-box">
                      <span className="answer-label">Hidden Answer:</span>
                      <HintBar
                        secondsLeft={secondsLeft}
                        answerPattern={room.answerPattern}
                        revealedHints={room.revealedHints}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Revealing phase ────────────────────────────────── */}
          {isRevealing && (
            <div className="revealing-phase">
              {/* Toggle bar */}
              <div className="reveal-toggle">
                <button
                  className={revealView === 'image' ? 'active' : ''}
                  onClick={() => setRevealView('image')}
                >
                  View Image
                </button>
                <button
                  className={revealView === 'scores' ? 'active' : ''}
                  onClick={() => setRevealView('scores')}
                >
                  View Scores
                </button>
              </div>

              {/* Image view */}
              {revealView === 'image' && (
                <FullImageView currentImage={room.currentImage} />
              )}

              {/* Scores view */}
              {revealView === 'scores' && roundRevealData && (
                <RoundScoresPanel
                  revealedAnswer={roundRevealData.revealedAnswer}
                  roundScores={roundRevealData.roundScores}
                />
              )}

              {/* Host control */}
              {isHost && (
                <button
                  className="next-turn-btn"
                  onClick={() => advanceTurn()}
                >
                  Start Next Turn →
                </button>
              )}
              {!isHost && (
                <p className="waiting-for-host">Waiting for host to start next turn…</p>
              )}
            </div>
          )}
        </main>

        <aside className="game-chat-pane">
          <ChatPanel />
        </aside>
      </div>
    </div>
  )
}

function TrollRevealPanel({ trollRevealData, you }) {
  const { pickerName, scoreDeltas } = trollRevealData

  // Sort: picker first, then everyone else by score delta desc
  const entries = Object.entries(scoreDeltas ?? {})
    .map(([uuid, data]) => ({ uuid, ...data }))
    .sort((a, b) => {
      if (a.isPicker && !b.isPicker) return -1
      if (!a.isPicker && b.isPicker) return 1
      return b.delta - a.delta
    })

  return (
    <div className="troll-reveal-panel">
      <div className="troll-reveal-icon" aria-hidden="true">🚫</div>
      <h2 className="troll-reveal-title">Round Skipped!</h2>
      <p className="troll-reveal-desc">
        <strong>{pickerName}</strong>'s image didn't match their answer.
        They've been penalised — everyone else gets a small bonus.
      </p>

      <ul className="rso-list troll-reveal-scores">
        {entries.map(({ uuid, name, before, after, delta, isPicker }) => (
          <li
            key={uuid}
            className={[
              'rso-row',
              isPicker ? 'rso-row--troll' : delta > 0 ? 'rso-row--positive' : 'rso-row--zero',
              uuid === you?.uuid ? 'rso-row--you' : '',
            ].join(' ')}
          >
            <span className="rso-name">
              {name}
              {isPicker && <span className="rso-badge rso-badge--troll">Picker 🚫</span>}
              {uuid === you?.uuid && !isPicker && <span className="rso-badge">You</span>}
            </span>
            <span className="rso-pts">
              {delta > 0 ? `+${Math.round(delta)}` : delta < 0 ? `${Math.round(delta)}` : '±0'}
            </span>
          </li>
        ))}
      </ul>

      <p className="troll-reveal-waiting">Next turn starting shortly…</p>
    </div>
  )
}

function RoundScoresPanel({ revealedAnswer, roundScores }) {
  const entries = Object.entries(roundScores ?? {})
    .map(([uuid, data]) => ({ uuid, ...data }))
    .sort((a, b) => {
      if (a.isPicker && !b.isPicker) return -1
      if (!a.isPicker && b.isPicker) return 1
      return b.pts - a.pts
    })

  return (
    <div className="round-scores-panel">
      <p className="rso-word-label">The word was</p>
      <h2 className="rso-word">{revealedAnswer ?? '?'}</h2>

      <ul className="rso-list">
        {entries.map(({ uuid, name, pts, isPicker }) => (
          <li key={uuid} className={`rso-row ${pts > 0 ? 'rso-row--positive' : 'rso-row--zero'}`}>
            <span className="rso-name">
              {name}
              {isPicker && <span className="rso-badge">Picker</span>}
            </span>
            <span className="rso-pts">{pts > 0 ? `+${Math.round(pts)}` : '+0'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TimeoutPenaltyPanel({ data, you }) {
  const { pickerName, scoreDeltas, message } = data

  const entries = Object.entries(scoreDeltas ?? {})
    .map(([uuid, deltaData]) => ({ uuid, ...deltaData }))
    .sort((a, b) => {
      if (a.isPicker && !b.isPicker) return -1
      if (!a.isPicker && b.isPicker) return 1
      return b.delta - a.delta
    })

  const isPicker = you?.uuid === data.pickerUuid
  return (
    <div className="troll-reveal-panel timeout-panel">
      <div className="troll-reveal-icon" aria-hidden="true">⏰</div>
      <h2 className="troll-reveal-title">Time's Up!</h2>

      <p className="troll-reveal-desc">
        {isPicker
          ? "You didn't pick an image in time."
          : (message || `${pickerName} didn't pick an image in time.`)}
      </p>

      <ul className="rso-list troll-reveal-scores">
        {entries.map(({ uuid, name, before, after, delta, isPicker }) => (
          <li
            key={uuid}
            className={[
              'rso-row',
              isPicker ? 'rso-row--troll' : delta > 0 ? 'rso-row--positive' : 'rso-row--zero',
              uuid === you?.uuid ? 'rso-row--you' : '',
            ].join(' ')}
          >
            <span className="rso-name">
              {name}
              {isPicker && <span className="rso-badge rso-badge--troll">Picker ⏰</span>}
              {uuid === you?.uuid && !isPicker && <span className="rso-badge">You</span>}
            </span>
            <span className="rso-pts">
              {delta > 0 ? `+${Math.round(delta)}` : delta < 0 ? `${Math.round(delta)}` : '±0'}
            </span>
          </li>
        ))}
      </ul>

      <p className="troll-reveal-waiting">Next turn starting shortly…</p>
    </div>
  )
}