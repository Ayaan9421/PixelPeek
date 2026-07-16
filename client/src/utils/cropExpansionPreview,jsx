export const CORNERS = [
  { key: 'top-left', label: 'Top-Left' },
  { key: 'top-right', label: 'Top-Right' },
  { key: 'bottom-left', label: 'Bottom-Left' },
  { key: 'bottom-right', label: 'Bottom-Right' },
]

// Mirrors server/src/utils/cropExpansion.js. Used here only to draw an
// instant dotted preview before the picker confirms -- the server
// recomputes and broadcasts the authoritative crop independently, so
// this never needs to be trusted, just close enough for a live preview.
export function previewExpandedCrop({ crop, corner, naturalWidth, naturalHeight, growthFactor }) {
  let newWidth = crop.width * growthFactor
  let newHeight = crop.height * growthFactor

  newWidth = Math.min(newWidth, naturalWidth)
  newHeight = Math.min(newHeight, naturalHeight)

  const aspect = crop.width / crop.height
  if (newWidth / newHeight > aspect) {
    newWidth = newHeight * aspect
  } else {
    newHeight = newWidth / aspect
  }

  const right = crop.x + crop.width
  const bottom = crop.y + crop.height

  let newX
  let newY

  switch (corner) {
    case 'top-left':
      newX = right - newWidth
      newY = bottom - newHeight
      break
    case 'top-right':
      newX = crop.x
      newY = bottom - newHeight
      break
    case 'bottom-left':
      newX = right - newWidth
      newY = crop.y
      break
    case 'bottom-right':
    default:
      newX = crop.x
      newY = crop.y
      break
  }

  newX = clamp(newX, 0, naturalWidth - newWidth)
  newY = clamp(newY, 0, naturalHeight - newHeight)

  return { x: newX, y: newY, width: newWidth, height: newHeight }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}