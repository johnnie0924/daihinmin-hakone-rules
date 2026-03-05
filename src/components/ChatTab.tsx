import { useEffect, useRef, useState } from 'react'
import type { ChatMessage, PeerRole } from '../hooks/usePeerChat'

type Props = {
  messages: ChatMessage[]
  nickname: string
  role: PeerRole
  canUseChat: boolean
  onSendMessage: (text: string) => void
}

function ChatTab({ messages, nickname, role, canUseChat, onSendMessage }: Props) {
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputText.trim()
    if (!trimmed) return
    onSendMessage(trimmed)
    setInputText('')
  }

  const renderEmptyMessage = () => {
    if (!canUseChat) {
      return role === 'host'
        ? 'ニックネームを入力し、Peer ID を共有して誰かの接続を待ってください。'
        : 'ニックネームを入力し、ホストの Peer ID で接続してください。'
    }
    return 'メッセージはまだありません。'
  }

  return (
    <section className="chat-section">
      <div className="messages">
        {messages.length === 0 && <p className="empty">{renderEmptyMessage()}</p>}
        {messages.map((m) =>
          m.type === 'system' ? (
            <div key={m.id} className="message system">
              <span className="message-text">{m.text}</span>
            </div>
          ) : (
            <div key={m.id} className={`message ${m.from}`}>
              <span className="message-label">
                {m.from === 'me'
                  ? (m.senderNickname ?? (nickname.trim() || '自分'))
                  : (m.senderNickname ?? '相手')}
              </span>
              <span className="message-text">{m.text}</span>
            </div>
          )
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="send-form">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="メッセージを入力..."
          disabled={!canUseChat}
        />
        <button type="submit" disabled={!canUseChat || !inputText.trim()}>
          送信
        </button>
      </form>
    </section>
  )
}

export default ChatTab

