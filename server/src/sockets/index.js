import { registerChatHandlers } from "./chatHandlers.js"
import { registerCropHandlers } from "./cropHandlers.js"
import { registerGameHandlers } from "./gameHandlers.js"
import { registerRoomHandlers } from "./roomHandlers.js"

export function registerSocketHandlers(io, socket) {
        registerRoomHandlers(io, socket)
        registerGameHandlers(io, socket)
        registerChatHandlers(io, socket)
        registerCropHandlers(io, socket)
        socket.on('disconnect', (reason) => {
                console.log(`socket disconnected: ${socket.id} (${reason})`)
        })
}