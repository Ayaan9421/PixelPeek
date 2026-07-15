export function findRoomCodeForSocket(socket) {
  for (const r of socket.rooms) {
    if (r !== socket.id) return r
  }
  return null;
}

export function findPlayerBySocket(room, socketId) {
  for (const player of room.players.values()) {
    if (player.socketId === socketId) return player
  }
  return null;
}