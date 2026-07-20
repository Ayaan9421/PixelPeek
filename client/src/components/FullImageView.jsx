import { imageUrlFromToken } from '../utils/api.jsx'

const DISPLAY_WIDTH = 520

export default function FullImageView({ currentImage }) {
  if (!currentImage) return null

  const { naturalWidth, naturalHeight } = currentImage
  const displayHeight = naturalWidth > 0
    ? Math.round((DISPLAY_WIDTH * naturalHeight) / naturalWidth)
    : DISPLAY_WIDTH

  return (
    <img
      src={imageUrlFromToken(currentImage.token)}
      alt="Round image"
      className="full-image-view"
      style={{ width: DISPLAY_WIDTH, height: displayHeight }}
      crossOrigin="anonymous"
    />
  )
}