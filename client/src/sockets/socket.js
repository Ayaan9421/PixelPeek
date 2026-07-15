import { io } from 'socket.io-client'

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'

export const socket = io(SERVER_URL, {
  autoConnect: false,
})

export function connectSocket() {
  if (!socket.connected) socket.connect()
}
