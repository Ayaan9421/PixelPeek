import { useEffect, useRef } from 'react'
import { imageUrlFromToken } from '../utils/api.jsx'

export default function CroppedImageView({ currentImage }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!currentImage) return
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const { crop } = currentImage

    // Fill the container width, respect the crop's aspect ratio
    const MAX_DISPLAY_HEIGHT = 500

    const cropAspect = crop.width / crop.height

    const displayHeight = Math.min(MAX_DISPLAY_HEIGHT, wrap.clientHeight || MAX_DISPLAY_HEIGHT)
    const displayWidth = Math.round(displayHeight * cropAspect)

    canvas.width = displayWidth
    canvas.height = displayHeight

    canvas.style.width = 'auto'
    canvas.style.height = '100%'

    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, displayWidth, displayHeight)
    }
    img.src = imageUrlFromToken(currentImage.token)
  }, [currentImage])

  if (!currentImage) return null

  return (
    <div ref={wrapRef} className="cropped-image-wrap">
      <canvas ref={canvasRef} className="round-image-canvas" />
    </div>
  )
}