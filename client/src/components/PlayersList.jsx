export default function PlayersList({ players, youUuid, pickerUuid }) {
  const sorted = [...players].sort((a, b) => b.score - a.score)

  return (
    <ul className="players-pane-list">
      {sorted.map((player) => (
        <li
          key={player.uuid}
          className={[
            player.uuid === youUuid ? 'you' : '',
            player.connected ? '' : 'disconnected',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="player-name">
            {player.name}
            {player.uuid === pickerUuid && <span className="badge picker-badge">Picker</span>}
          </span>
          <span className="player-score">{Math.round(player.score)}</span>
        </li>
      ))}
    </ul>
  )
}