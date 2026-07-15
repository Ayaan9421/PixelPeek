import { useEffect, useState } from "react";

export function useCountdown(deadline) {
  const [secondsLeft, setSecondsLeft] = useState(() => computeSecondsLeft(deadline))

  useEffect(() => {
    setSecondsLeft(computeSecondsLeft(deadline))
    if (!deadline) return

    const interval = setInterval(() => {
      setSecondsLeft(computeSecondsLeft(deadline))
    }, 250)

    return () => clearInterval(interval)
  }, [deadline])

  return secondsLeft
}

function computeSecondsLeft(deadline) {
  if (!deadline) return 0
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
}