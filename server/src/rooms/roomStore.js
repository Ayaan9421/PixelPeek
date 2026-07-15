const rooms = new Map()

export function createRoom(roomCode, initialState) {
        rooms.set(roomCode, initialState)
        return rooms.get(roomCode)
}

export function getRoom(roomCode) {
        return rooms.get(roomCode)
}

export function updateRoom(roomCode, updater) {
        const room = rooms.get(roomCode)
        if (!room) return null
        updater(room)
        return room
}

export function deleteRoom(roomCode) {
        rooms.delete(roomCode)
}

export function hasRoom(roomCode) {
        return rooms.has(roomCode)
}

export function allRoomCodes() {
        return Array.from(rooms.keys())
}

