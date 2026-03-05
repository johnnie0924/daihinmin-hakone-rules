import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from './usePeerChat'

type ActiveTab = 'chat' | 'game'

export function useUnreadChatCount(messages: ChatMessage[], activeTab: ActiveTab) {
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const prevMessagesLengthRef = useRef(0)

  useEffect(() => {
    const prev = prevMessagesLengthRef.current
    const len = messages.length

    if (len > prev && activeTab !== 'chat') {
      const diff = len - prev
      setUnreadChatCount((c) => c + diff)
    }

    prevMessagesLengthRef.current = len
  }, [messages, activeTab])

  const resetUnreadChatCount = () => {
    setUnreadChatCount(0)
  }

  return { unreadChatCount, resetUnreadChatCount }
}

