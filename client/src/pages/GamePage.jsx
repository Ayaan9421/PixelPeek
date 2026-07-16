import { useRoom } from '../context/RoomContext.jsx'
import { useCountdown } from '../hooks/useCountdown.js'
import CropSelector from '../components/CropSelector.jsx'
import CroppedImageView from '../components/CroppedImageView.jsx'
import CropExpansionPanel from '../components/CropExpansionPanel.jsx'
import PlayersList from '../components/PlayersList.jsx'
import ChatPanel from '../components/ChatPanel.jsx'
import HintBar from '../components/HintBar.jsx'

export default function GamePage() {
  const { room, you, leaveRoom } = useRoom()
  const secondsLeft = useCountdown(room?.roundDeadline)

  if (!room) return null

  if (room.status === 'ended') {
    const ranked = [...room.players].sort((a, b) => b.score - a.score)
    return (
      <div className="game-page">
        <h2>Game Over</h2>
        <ol className="scoreboard">
          {ranked.map((player) => (
            <li key={player.uuid} className={player.uuid === you?.uuid ? 'you' : ''}>
              <span>{player.name}</span>
              <span>{Math.round(player.score)}</span>
            </li>
          ))}
        </ol>
        <button type="button" onClick={leaveRoom} className="leave-btn">
          Back to Home
        </button>
      </div>
    )
  }

  const picker = room.players.find((p) => p.uuid === room.pickerUuid)
  const isPicker = room.pickerUuid === you?.uuid

  return (
    <div className="game-page game-page--active">
      <div className="round-meta">
        Round {room.currentRound} / {room.settings.numRounds} — turn {room.turnNumberInRound} /{' '}
        {room.playersPerRound}
      </div>

      <div className="game-layout">
        <aside className="players-pane">
          <h3 className="pane-heading">Players</h3>
          <PlayersList players={room.players} youUuid={you?.uuid} pickerUuid={room.pickerUuid} />
        </aside>

        <main className="center-pane">
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

          {room.roundPhase === 'guessing' && (
            <div className="guessing-phase">
              <h2>{isPicker ? 'Manage the reveal' : `Guess ${picker?.name}'s image`}</h2>
              <HintBar secondsLeft={secondsLeft} answerPattern={room.answerPattern} revealedHints={room.revealedHints} />
              {(isPicker && room.currentImage) ? (
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
        </main>

        <ChatPanel />
      </div>
    </div>
  )
}