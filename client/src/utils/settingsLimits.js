export const SETTINGS_LIMITS = {
  maxPlayers: { min: 2, max: 20, default: 8, label: 'Max players' },
  guessTimeSec: { min: 30, max: 180, default: 90, label: 'Guess time (sec)' },
  pickTimeSec: { min: 10, max: 60, default: 20, label: 'Pick time (sec)' },
  numRounds: { min: 1, max: 30, default: 10, label: 'Rounds' },
  numHints: { min: 0, max: 5, default: 3, label: 'Letter hints' },
}