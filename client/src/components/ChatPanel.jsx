import { useEffect, useRef, useState } from 'react'
import { useChat } from '../hooks/useChat.js'
import { useRoom } from '../context/RoomContext.jsx'

export default function ChatPanel() {
  const { you } = useRoom()
  const { messages, sendMessage } = useChat()
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState(null)
  const listRef = useRef(null)

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  function handleSubmit(e) {
    e.preventDefault()
    if (!draft.trim()) return
    setSendError(null)
    sendMessage(draft, setSendError)
    setDraft('')
  }

  return (
    <div className="chat-pane">
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && <p className="chat-empty">No messages yet — say hi!</p>}
        {messages.map((m) => (
          <ChatTile key={m.id} entry={m} isYou={m.playerUuid === you?.uuid} />
        ))}
      </div>

      {sendError && <p className="error-text chat-error">{sendError}</p>}

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a guess or say something…"
          maxLength={200}
        />
        <button type="submit" disabled={!draft.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}

function ChatTile({ entry, isYou }) {
  if (entry.type === 'correct-guess') {
    return (
      <div className="chat-message chat-message--correct">
        <span className="chat-text">{entry.text}</span>
      </div>
    )
  }

  return (
    <div className={`chat-message${isYou ? ' chat-message--you' : ''}`}>
      <span className="chat-name">{entry.playerName}</span>
      <span className="chat-text">{entry.text}</span>
    </div>
  )
}