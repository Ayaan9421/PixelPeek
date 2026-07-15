import { useCallback, useEffect, useRef, useState } from "react";
import { useRoom } from "../context/RoomContext.jsx";
import { validateImageFile } from "../utils/ImageValidations.jsx";
import { uploadPickedImage } from "../utils/api.jsx";

const DISPLAY_WIDTH = 420

export default function CropSelector() {
  const { room, you } = useRoom()
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [natural, setNatural] = useState(null) // { width, height }
  const [displayHeight, setDisplayHeight] = useState(0)
  const [selection, setSelection] = useState(null) // display-space {x, y, width, height}
  const [dragStart, setDragStart] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const containerRef = useRef(null)

  const handleFile = useCallback((candidate) => {
    setFileError(null)
    setUploadError(null)
    const err = validateImageFile(candidate)
    if (err) {
      setFileError(err)
      return
    }
    setFile(candidate)
    setSelection(null)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(candidate)
    })
  }, [])

  useEffect(() => {
    function onPaste(e) {
      const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'))
      if (item) handleFile(item.getAsFile())
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [handleFile])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function onImageLoad(e) {
    const { naturalWidth, naturalHeight } = e.target
    setNatural({ width: naturalWidth, height: naturalHeight })
    setDisplayHeight(Math.round((DISPLAY_WIDTH * naturalHeight) / naturalWidth))
  }

  function onDrop(e) {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) handleFile(dropped)
  }

  function onBrowse(e) {
    const chosen = e.target.files?.[0]
    if (chosen) handleFile(chosen)
  }

  function getRelativePos(e) {
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.min(Math.max(e.clientX - rect.left, 0), DISPLAY_WIDTH)
    const y = Math.min(Math.max(e.clientY - rect.top, 0), displayHeight)
    return { x, y }
  }

  function onMouseDown(e) {
    if (!natural) return
    const pos = getRelativePos(e)
    setDragStart(pos)
    setSelection({ x: pos.x, y: pos.y, width: 0, height: 0 })
  }

  function onMouseMove(e) {
    if (!dragStart) return
    const pos = getRelativePos(e)
    setSelection({
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      width: Math.abs(pos.x - dragStart.x),
      height: Math.abs(pos.y - dragStart.y),
    })
  }

  function onMouseUp() {
    setDragStart(null)
  }

  async function handleLockCrop() {
    setUploadError(null)
    if (!file || !natural) {
      setUploadError('Pick an image first.')
      return
    }
    if (!selection || selection.width < 10 || selection.height < 10) {
      setUploadError('Drag a crop selection on the image first.')
      return
    }

    const scale = natural.width / DISPLAY_WIDTH
    const crop = {
      x: selection.x * scale,
      y: selection.y * scale,
      width: selection.width * scale,
      height: selection.height * scale,
    }

    setUploading(true)
    try {
      await uploadPickedImage({
        roomCode: room.code,
        playerUuid: you.uuid,
        file,
        crop,
        naturalWidth: natural.width,
        naturalHeight: natural.height,
      })
    } catch (err) {
      setUploadError(err.message)
      setUploading(false)
    }
  }


  return (
    <div className="crop-selector">
      {!previewUrl ? (
        <div className="drop-zone" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          <p>
            Paste (Ctrl+V), drag &amp; drop, or{' '}
            <label className="browse-link">
              browse
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onBrowse} hidden />
            </label>{' '}
            an image
          </p>
        </div>
      ) : (
        <>
          <p className="hint-text">Drag on the image to select what guessers will see revealed.</p>
          <div
            ref={containerRef}
            className="crop-frame"
            style={{ width: DISPLAY_WIDTH, height: displayHeight || undefined }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <img src={previewUrl} onLoad={onImageLoad} className="crop-source-img" draggable={false} />
            {selection && (
              <div
                className="crop-rect"
                style={{
                  left: selection.x,
                  top: selection.y,
                  width: selection.width,
                  height: selection.height,
                }}
              />
            )}
          </div>

          <div className="crop-actions">
            <label className="browse-link">
              Choose a different image
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onBrowse} hidden />
            </label>
            <button type="button" onClick={handleLockCrop} disabled={uploading}>
              {uploading ? 'Locking in…' : 'Lock Crop'}
            </button>
          </div>
        </>
      )}

      {fileError && <p className="error-text">{fileError}</p>}
      {uploadError && <p className="error-text">{uploadError}</p>}
    </div>
  )
}