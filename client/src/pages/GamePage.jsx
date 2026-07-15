import { useRoom } from '../context/RoomContext.jsx'
import { useCountdown } from '../hooks/useCountdown.js'
import CropSelector from '../components/CropSelector.jsx'
import CroppedImageView from '../components/CroppedImageView.jsx'

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
    <div className="game-page">
      <div className="round-meta">
        Round {room.currentRound} / {room.settings.numRounds} — turn {room.turnNumberInRound} /{' '}
        {room.playersPerRound}
      </div>

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
          <h2>{isPicker ? 'Waiting for guesses…' : `Guess ${picker?.name}'s image`}</h2>
          <p className="countdown">{secondsLeft}s</p>
          <CroppedImageView currentImage={room.currentImage} />
          <p className="hint-text">Guess submission and scoring come next — not wired up yet.</p>
        </div>
      )}

      <ol className="scoreboard compact">
        {[...room.players]
          .sort((a, b) => b.score - a.score)
          .map((player) => (
            <li key={player.uuid} className={player.uuid === you?.uuid ? 'you' : ''}>
              <span>{player.name}</span>
              <span>{Math.round(player.score)}</span>
            </li>
          ))}
      </ol>
    </div>
  )
}