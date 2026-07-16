import { useCallback, useEffect, useState } from "react";
import { socket } from '../sockets/socket.js'

export function useChat() {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    function onChatMessage(entry) {
      setMessages((prev) => [...prev, entry])
    }
    function onChatCleared() {
      setMessages([])
    }

    socket.on('chat-message', onChatMessage)
    socket.on('chat-cleared', onChatCleared)

    return () => {
      socket.off('chat-message', onChatMessage)
      socket.off('chat-cleared', onChatCleared)
    }
  }, [])

  const sendMessage = useCallback((text, onError) => {
    const trimmed = text.trim()
    if (!trimmed) return
    socket.emit('send-chat-message', { text: trimmed }, (res) => {
      if (!res.ok && onError) onError(res.error)
    })
  }, [])

  return { messages, sendMessage }
}