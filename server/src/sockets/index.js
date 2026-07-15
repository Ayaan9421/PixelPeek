import { registerGameHandlers } from "./gameHandlers.js"
import { registerRoomHandlers } from "./roomHandlers.js"

export function registerSocketHandlers(io, socket) {
        registerRoomHandlers(io, socket)
        registerGameHandlers(io, socket)

        socket.on('disconnect', (reason) => {
                console.log(`socket disconnected: ${socket.id} (${reason})`)
        })
}