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

export default function GamePage() {
  const {
    room, you, leaveRoom,
    correctGuessers, roundRevealData, frozenScores,
    roundGallery, advanceTurn, isHost, trollBanner,
    trollRevealData, timeoutPenaltyData,
    newGame, endRoom,
  } = useRoom()
  const secondsLeft = useCountdown(room?.roundDeadline)
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
        <h2 className="ended-title">Game Over</h2>

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
                />
                <div className="gallery-caption">
                  <span className="gallery-answer">{entry.answer}</span>
                  <span className="gallery-picker">by {entry.pickerName}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {isHost ? (
          <div className="ended-host-actions">
            <button
              type="button"
              className="ended-action-btn ended-action-btn--primary"
              onClick={() => newGame()}
            >
              🔄 Start New Game
            </button>
            <button
              type="button"
              className="ended-action-btn ended-action-btn--danger"
              onClick={() => endRoom()}
            >
              ✕ End Room
            </button>
          </div>
        ) : (
          <div className="ended-guest-actions">
            <p className="waiting-for-host">Waiting for host to start a new game…</p>
            <button type="button" onClick={leaveRoom} className="leave-btn ended-leave">
              Leave Room
            </button>
          </div>
        )}
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

  return (
    <div className="game-page game-page--active">
      <div className="round-meta">
        Round {room.currentRound} / {room.settings.numRounds} — turn {room.turnNumberInRound} /{' '}
        {room.playersPerRound}
      </div>

      <div className="game-layout">
        <aside className="players-pane">
          <h3 className="pane-heading">Players</h3>
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
              <h2>{isPicker ? "It's your turn to pick!" : `Waiting on ${picker?.name ?? '…'}`}</h2>
              <p className="countdown">{secondsLeft}s</p>
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
              <h2>{isPicker ? 'Manage the reveal' : `Guess ${picker?.name}'s image`}</h2>
              <HintBar
                secondsLeft={secondsLeft}
                answerPattern={room.answerPattern}
                revealedHints={room.revealedHints}
              />
              {isPicker && room.currentImage ? (
                <CropExpansionPanel
                  currentImage={room.currentImage}
                  secondsLeft={secondsLeft}
                  guessTimeSec={room.settings.guessTimeSec}
                />
              ) : (
                <CroppedImageView currentImage={room.currentImage} />
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

        <ChatPanel />
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
              {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '±0'}
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
            <span className="rso-pts">{pts > 0 ? `+${pts}` : '+0'}</span>
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
              {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '±0'}
            </span>
          </li>
        ))}
      </ul>

      <p className="troll-reveal-waiting">Next turn starting shortly…</p>
    </div>
  )
}