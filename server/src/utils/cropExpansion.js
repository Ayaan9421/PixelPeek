export const VALID_CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

export function isValidCorner(corner) {
  return VALID_CORNERS.includes(corner)
}

export function computeExpandedCrop({ crop, corner, naturalWidth, naturalHeight, growthFactor }) {
  let newWidth = crop.width * growthFactor
  let newHeight = crop.height * growthFactor

  newWidth = Math.min(newWidth, naturalWidth)
  newHeight = Math.min(newHeight, naturalHeight)

  // If one dimension hit the image's edge harder than the other, rescale
  // the looser one back down so the crop's own aspect ratio is preserved.
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

  return {
    x: Math.round(newX),
    y: Math.round(newY),
    width: Math.round(newWidth),
    height: Math.round(newHeight),
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}