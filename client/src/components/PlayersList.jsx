import { avatarForUuid } from '../utils/avatarSelection.js'
import '../styles/PlayersList.css'

export default function PlayersList({ players, youUuid, pickerUuid, correctGuessers, frozenScores }) {
  // During guessing + revealing, frozenScores holds each player's score as it
  // was when the round started. This prevents correct-guess points from
  // appearing in the list mid-round. frozenScores is null during picking,
  // so live scores show normally then.
  const scoreFor = (player) =>
    frozenScores ? (frozenScores[player.uuid] ?? player.score) : player.score

  const sorted = [...players].sort((a, b) => scoreFor(b) - scoreFor(a))

  return (
    <div className="players-card">
      <h3 className="players-card-heading">Players</h3>

      <ul className="players-pane-list">
        {sorted.map((player) => {
          const isYou = player.uuid === youUuid
          const hasGuessed = correctGuessers?.has(player.uuid)
          const classes = [
            'players-pane-row',
            isYou ? 'you' : '',
            player.connected ? '' : 'disconnected',
            hasGuessed ? 'guessed-correct' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <li key={player.uuid} className={classes}>
              <span className="avatar-wrap">
                <img
                  className="player-avatar"
                  src={`/images/icon${avatarForUuid(player.uuid)}.PNG`}
                  alt=""
                />
                {isYou && <span className="you-dot" title="You" />}
              </span>

              <span className="player-name">
                {player.name}
                {player.uuid === pickerUuid && <span className="badge picker-badge">Picker</span>}
                {hasGuessed && <span className="badge guessed-badge">✓</span>}
              </span>

              <span className="player-score">{Math.round(scoreFor(player))}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}