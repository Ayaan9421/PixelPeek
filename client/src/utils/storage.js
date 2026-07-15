const KEYS = {
  uuid: 'gtc_playerUuid',
  name: 'gtc_playerName',
  roomCode: 'gtc_roomCode',
}

export function getStoredIdentity() {
  return {
    uuid: localStorage.getItem(KEYS.uuid),
    name: localStorage.getItem(KEYS.name),
    roomCode: localStorage.getItem(KEYS.roomCode),
  }
}

export function saveIdentity({ uuid, name, roomCode }) {
  if (uuid) localStorage.setItem(KEYS.uuid, uuid)
  if (name) localStorage.setItem(KEYS.name, name)
  if (roomCode) localStorage.setItem(KEYS.roomCode, roomCode)
}

export function clearIdentity() {
  localStorage.removeItem(KEYS.uuid)
  localStorage.removeItem(KEYS.name)
  localStorage.removeItem(KEYS.roomCode)
}