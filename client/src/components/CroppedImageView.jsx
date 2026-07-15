import { useEffect, useRef } from 'react'
import { imageUrlFromToken } from '../utils/api.jsx'

const DISPLAY_WIDTH = 420

export default function CroppedImageView({ currentImage }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!currentImage) return
    const canvas = canvasRef.current
    if (!canvas) return

    const { crop } = currentImage
    const displayHeight = Math.round((DISPLAY_WIDTH * crop.height) / crop.width)
    canvas.width = DISPLAY_WIDTH
    canvas.height = displayHeight

    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.drawImage(
        img,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        DISPLAY_WIDTH,
        displayHeight
      )
    }
    img.src = imageUrlFromToken(currentImage.token)
  }, [currentImage])

  if (!currentImage) return null

  return <canvas ref={canvasRef} className="round-image-canvas" />
}