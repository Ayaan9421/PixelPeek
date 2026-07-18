const sounds = {
  join: new Audio('/sounds/join.mp3'),
  leave: new Audio('/sounds/leave.mp3'),
  correct: new Audio('/sounds/correct.mp3'),
  complete: new Audio('/sounds/complete.mp3'),
  penalty: new Audio('/sounds/penalty.mp3'),
  start: new Audio('/sounds/start.mp3')
}

export function playSound(key, volume = 0.7) {
  const sound = sounds[key]
  if (!sound) return

  sound.volume = volume
  sound.currentTime = 0
  sound.play().catch(() => { })
}

export function preloadSounds() {
  Object.values(sounds).forEach(s => {
    s.load()
  })
}