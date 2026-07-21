// answerPattern  – array of word lengths, e.g. [6, 8] for "golden retriever"
// revealedHints  – array of { charIndex, letter } where charIndex is a flat
//                  index into the full answer string (spaces count as positions
//                  but are never revealed as hints).
export default function HintBar({ secondsLeft, answerPattern, revealedHints }) {
  // Build a Map<flatIndex, letter> for O(1) lookups while rendering.
  const revealed = new Map((revealedHints ?? []).map(({ charIndex, letter }) => [charIndex, letter]))

  let flatOffset = 0

  return (
    <div className="hint-bar">
      <div className="hint-blanks">
        {(answerPattern || []).map((wordLength, wordIndex) => {
          const wordStart = flatOffset
          flatOffset += wordLength + 1

          return (
            <span className="hint-word" key={wordIndex}>
              {Array.from({ length: wordLength }, (_, i) => {
                const charIndex = wordStart + i
                const letter = revealed.get(charIndex)
                return (
                  <span
                    key={i}
                    className={`hint-blank${letter ? ' hint-blank--revealed' : ''}`}
                  >
                    {letter ?? ' '}
                  </span>
                )
              })}
            </span>
          )
        })}
      </div>
    </div>
  )
}