import { SERVER_URL } from '../sockets/socket.js'

export async function uploadPickedImage({ roomCode, playerUuid, file, crop, naturalWidth, naturalHeight }) {
  const form = new FormData()
  form.append('image', file)
  form.append('roomCode', roomCode)
  form.append('playerUuid', playerUuid)
  form.append('cropX', Math.round(crop.x))
  form.append('cropY', Math.round(crop.y))
  form.append('cropWidth', Math.round(crop.width))
  form.append('cropHeight', Math.round(crop.height))
  form.append('naturalWidth', Math.round(naturalWidth))
  form.append('naturalHeight', Math.round(naturalHeight))

  const res = await fetch(`${SERVER_URL}/api/upload-image`, { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Upload failed.')
  }
  return data
}

export function imageUrlFromToken(token) {
  return `${SERVER_URL}/api/image/${token}`
}