// import { useEffect, useMemo, useState } from 'react'
// import { useRoom } from '../context/RoomContext.jsx'
// import { imageUrlFromToken } from '../utils/api.jsx'
// import { CORNERS, previewExpandedCrop } from '../utils/cropExpansionPreview,js'
// import '../styles/CropExpansionPanel.css'

// const DISPLAY_WIDTH = 520

// export default function CropExpansionPanel({ currentImage, secondsLeft, guessTimeSec }) {
//   const { selectExpansionCorner } = useRoom()
//   const [selectedCorner, setSelectedCorner] = useState(null)
//   const [error, setError] = useState(null)

//   if (!currentImage) {
//     return null; // Or return a fallback UI like <div>No image selected</div>
//   }
//   const { crop, naturalWidth, naturalHeight, expansionsUsed, maxExpansions, expansionCheckpoints } =
//     currentImage

//   // Once the server actually applies an expansion (expansionsUsed bumps),
//   // that checkpoint is done -- clear any stale "selected" highlight so it
//   // doesn't carry over into the next checkpoint's selection.
//   useEffect(() => {
//     setSelectedCorner(null)
//   }, [expansionsUsed])

//   const displayHeight = Math.round((DISPLAY_WIDTH * naturalHeight) / naturalWidth)
//   const scale = DISPLAY_WIDTH / naturalWidth

//   const expansionsLeft = maxExpansions - expansionsUsed
//   const nextRequiredFraction = expansionCheckpoints[expansionsUsed] ?? null

//   // secondsLeft counts down to roundDeadline; derive elapsed time from it
//   // so we can show "next expansion in Xs" without needing our own clock.
//   const elapsedSeconds = guessTimeSec - secondsLeft
//   const secondsUntilNextCheckpoint =
//     nextRequiredFraction !== null
//       ? Math.max(0, Math.ceil(guessTimeSec * nextRequiredFraction - elapsedSeconds))
//       : null

//   const previewCrop = useMemo(() => {
//     if (!selectedCorner) return null
//     return previewExpandedCrop({
//       crop,
//       corner: selectedCorner,
//       naturalWidth,
//       naturalHeight,
//       growthFactor: 1.6,
//     })
//   }, [selectedCorner, crop, naturalWidth, naturalHeight])

//   function toDisplayRect(rect) {
//     return {
//       left: rect.x * scale,
//       top: rect.y * scale,
//       width: rect.width * scale,
//       height: rect.height * scale,
//     }
//   }

//   // Selecting a corner just records the picker's preference -- it takes
//   // effect automatically when the round timer hits the next checkpoint.
//   // No confirm step, and the picker can change their mind freely until then.
//   function handleSelectCorner(key) {
//     if (expansionsLeft <= 0) return
//     setSelectedCorner(key)
//     setError(null)
//     selectExpansionCorner(key, (err) => setError(err))
//   }

//   const currentRect = toDisplayRect(crop)
//   const previewRect = previewCrop ? toDisplayRect(previewCrop) : null

//   return (
//     <div className="crop-expansion-panel">
//       <p className="hint-text">This is what guessers currently see (outlined below).</p>

//       <div
//         className="expansion-frame"
//         style={{ width: DISPLAY_WIDTH, height: displayHeight }}
//       >
//         {/* eslint-disable-next-line jsx-a11y/alt-text */}
//         <img
//           src={imageUrlFromToken(currentImage.token)}
//           className="expansion-source-img"
//           draggable={false}
//         />
//         <div
//           className="expansion-current-rect"
//           style={{ left: currentRect.left, top: currentRect.top, width: currentRect.width, height: currentRect.height }}
//         />
//         {previewRect && (
//           <div
//             className="expansion-preview-rect"
//             style={{ left: previewRect.left, top: previewRect.top, width: previewRect.width, height: previewRect.height }}
//           />
//         )}
//       </div>

//       <p className="expansion-status">
//         Expansions left: {expansionsLeft} / {maxExpansions}
//         {expansionsLeft > 0 && secondsUntilNextCheckpoint !== null && (
//           <> — next expansion in {secondsUntilNextCheckpoint}s</>
//         )}
//       </p>

//       {expansionsLeft > 0 ? (
//         <>
//           <p className="hint-text">
//             Pick a corner to grow toward — it expands automatically at the next checkpoint.
//             Change your mind anytime before then. If you don&apos;t pick, a random corner is used.
//           </p>
//           <div className="expansion-corner-grid">
//             {CORNERS.map(({ key, label }) => (
//               <button
//                 key={key}
//                 type="button"
//                 className={selectedCorner === key ? 'selected' : ''}
//                 onClick={() => handleSelectCorner(key)}
//               >
//                 {label}
//               </button>
//             ))}
//           </div>
//         </>
//       ) : (
//         <p className="hint-text">No expansions remaining this round.</p>
//       )}

//       {error && <p className="error-text">{error}</p>}
//     </div>
//   )
// }


import { useEffect, useMemo, useState } from 'react'
import { useRoom } from '../context/RoomContext.jsx'
import { imageUrlFromToken } from '../utils/api.jsx'
import { CORNERS, previewExpandedCrop } from '../utils/cropExpansionPreview.js'
import '../styles/CropExpansionPanel.css'

// The picker already knows what the image is -- this frame only needs to
// be big enough to see where the crop rectangle sits, not to view the
// image itself. Keep it small so the whole panel fits one viewport.
const MAX_DISPLAY_WIDTH = 260
const MAX_DISPLAY_HEIGHT = 220

export default function CropExpansionPanel({ currentImage, secondsLeft, guessTimeSec }) {
  const { selectExpansionCorner } = useRoom()
  const [selectedCorner, setSelectedCorner] = useState(null)
  const [error, setError] = useState(null)

  if (!currentImage) {
    return null; // Or return a fallback UI like <div>No image selected</div>
  }
  const { crop, naturalWidth, naturalHeight, expansionsUsed, maxExpansions, expansionCheckpoints } =
    currentImage

  // Fit within the box on whichever axis is the tighter constraint.
  const widthCappedHeight = Math.round((MAX_DISPLAY_WIDTH * naturalHeight) / naturalWidth)
  const DISPLAY_WIDTH =
    widthCappedHeight <= MAX_DISPLAY_HEIGHT
      ? MAX_DISPLAY_WIDTH
      : Math.round((MAX_DISPLAY_HEIGHT * naturalWidth) / naturalHeight)

  // Once the server actually applies an expansion (expansionsUsed bumps),
  // that checkpoint is done -- clear any stale "selected" highlight so it
  // doesn't carry over into the next checkpoint's selection.
  useEffect(() => {
    setSelectedCorner(null)
  }, [expansionsUsed])

  const displayHeight = Math.round((DISPLAY_WIDTH * naturalHeight) / naturalWidth)
  const scale = DISPLAY_WIDTH / naturalWidth

  const expansionsLeft = maxExpansions - expansionsUsed
  const nextRequiredFraction = expansionCheckpoints[expansionsUsed] ?? null

  // secondsLeft counts down to roundDeadline; derive elapsed time from it
  // so we can show "next expansion in Xs" without needing our own clock.
  const elapsedSeconds = guessTimeSec - secondsLeft
  const secondsUntilNextCheckpoint =
    nextRequiredFraction !== null
      ? Math.max(0, Math.ceil(guessTimeSec * nextRequiredFraction - elapsedSeconds))
      : null

  const previewCrop = useMemo(() => {
    if (!selectedCorner) return null
    return previewExpandedCrop({
      crop,
      corner: selectedCorner,
      naturalWidth,
      naturalHeight,
      growthFactor: 1.6,
    })
  }, [selectedCorner, crop, naturalWidth, naturalHeight])

  function toDisplayRect(rect) {
    return {
      left: rect.x * scale,
      top: rect.y * scale,
      width: rect.width * scale,
      height: rect.height * scale,
    }
  }

  // Selecting a corner just records the picker's preference -- it takes
  // effect automatically when the round timer hits the next checkpoint.
  // No confirm step, and the picker can change their mind freely until then.
  function handleSelectCorner(key) {
    if (expansionsLeft <= 0) return
    setSelectedCorner(key)
    setError(null)
    selectExpansionCorner(key, (err) => setError(err))
  }

  const currentRect = toDisplayRect(crop)
  const previewRect = previewCrop ? toDisplayRect(previewCrop) : null

  return (
    <div className="crop-expansion-panel">
      <p className="hint-text">Guessers' current view:</p>

      <div
        className="expansion-frame"
        style={{ width: DISPLAY_WIDTH, height: displayHeight }}
      >
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img
          src={imageUrlFromToken(currentImage.token)}
          className="expansion-source-img"
          draggable={false}
        />
        <div
          className="expansion-current-rect"
          style={{ left: currentRect.left, top: currentRect.top, width: currentRect.width, height: currentRect.height }}
        />
        {previewRect && (
          <div
            className="expansion-preview-rect"
            style={{ left: previewRect.left, top: previewRect.top, width: previewRect.width, height: previewRect.height }}
          />
        )}
      </div>

      <p className="expansion-status">
        Expansions left: {expansionsLeft} / {maxExpansions}
        {expansionsLeft > 0 && secondsUntilNextCheckpoint !== null && (
          <> — next expansion in {secondsUntilNextCheckpoint}s</>
        )}
      </p>

      {expansionsLeft > 0 ? (
        <>
          <p className="hint-text">Pick a corner to grow toward:</p>
          <div className="expansion-corner-grid">
            {CORNERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={selectedCorner === key ? 'selected' : ''}
                onClick={() => handleSelectCorner(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="hint-text">No expansions remaining this round.</p>
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  )
}