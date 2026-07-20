const AVATAR_COUNT = 20
export function avatarForUuid(uuid) {
  let hash = 0
  for (let i = 0; i < uuid.length; i++) {
    hash = (hash * 31 + uuid.charCodeAt(i)) >>> 0
  }
  return (hash % AVATAR_COUNT) + 1
}