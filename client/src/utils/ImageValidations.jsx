export const IMAGE_LIMIT = {
  maxBytes: 8 * 1024 * 1024,
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
}

export function validateImageFile(file) {
  if (!file) return 'No Image selected.'
  if (!IMAGE_LIMIT.allowedMimeTypes.includes(file.type)) {
    return 'Unsupported image type. Use PNG, JPEG, or WebP.'
  }
  if (file.size > IMAGE_LIMIT.maxBytes) {
    return `Image must be under ${IMAGE_LIMIT.maxBytes / (1024 * 1024)}MB.`
  }
  return null
}
