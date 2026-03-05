import { useState, useEffect, useRef, useCallback } from 'react'
import Peer, { type DataConnection } from 'peerjs'
import type { WireGameData } from '../types/game'

export type ChatMessage = {
  id: string
  from: 'me' | 'remote'
  text: string
  at: number
  senderNickname?: string
  type?: 'chat' | 'system'
}

export type PeerRole = 'host' | 'client'

type WireJoin = { type: 'join'; nickname: string }
type WireChat = { type: 'chat'; nickname: string; text: string }
type WireMessage = WireJoin | WireChat | WireGameData

const MAX_HOST_CONNECTIONS = 2

export function usePeerChat(nickname: string, role: PeerRole) {
  const [myId, setMyId] = useState<string | null>(null)
  const [hostIdInput, setHostIdInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [connectionCount, setConnectionCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [connectedPeers, setConnectedPeers] = useState<{ peerId: string; nickname: string }[]>([])

  const peerRef = useRef<Peer | null>(null)
  const connRef = useRef<DataConnection | null>(null)
  const connectionsRef = useRef<DataConnection[]>([])
  const nicknameByPeerIdRef = useRef<Map<string, string>>(new Map())
  const nicknameRef = useRef(nickname)
  nicknameRef.current = nickname

  // ゲームデータハンドラ（useGame から登録）
  const onGameDataRef = useRef<((fromPeerId: string, data: WireGameData) => void) | null>(null)

  const addMessage = useCallback(
    (from: 'me' | 'remote', text: string, senderNickname?: string, type: 'chat' | 'system' = 'chat') => {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), from, text, at: Date.now(), senderNickname, type },
      ])
    },
    []
  )

  const updateConnectedPeers = useCallback(() => {
    setConnectedPeers(
      Array.from(nicknameByPeerIdRef.current.entries()).map(([peerId, nick]) => ({ peerId, nickname: nick }))
    )
  }, [])

  const isFullyConnected =
    role === 'host' ? connectionCount >= MAX_HOST_CONNECTIONS : connectionCount >= 1

  const setupHostConnection = useCallback(
    (conn: DataConnection) => {
      if (connectionsRef.current.length >= MAX_HOST_CONNECTIONS) {
        conn.close()
        return
      }
      connectionsRef.current.push(conn)
      setConnectionCount(connectionsRef.current.length)
      setConnectionStatus(
        connectionsRef.current.length >= MAX_HOST_CONNECTIONS ? 'connected' : 'disconnected'
      )
      setError(null)

      conn.on('data', (data: unknown) => {
        const msg = data as WireMessage
        if (!msg || typeof msg !== 'object' || !('type' in msg)) return

        // ゲームメッセージはゲームハンドラへ
        if (msg.type === 'game:action' || msg.type === 'game:state' || msg.type === 'game:reveal' || msg.type === 'game:error' || msg.type === 'game:reset') {
          onGameDataRef.current?.(conn.peer, msg as WireGameData)
          return
        }

        if (msg.type === 'join') {
          nicknameByPeerIdRef.current.set(conn.peer, msg.nickname)
          updateConnectedPeers()
          addMessage('remote', `${msg.nickname}が参加しました`, undefined, 'system')
          const hostJoin: WireJoin = { type: 'join', nickname: nicknameRef.current }
          conn.send(hostJoin)
          connectionsRef.current.forEach((c) => {
            if (c !== conn && c.open) c.send(msg)
          })
          return
        }
        if (msg.type === 'chat') {
          nicknameByPeerIdRef.current.set(conn.peer, msg.nickname)
          const senderName = msg.nickname
          addMessage('remote', msg.text, senderName, 'chat')
          const payload: WireChat = { type: 'chat', nickname: senderName, text: msg.text }
          connectionsRef.current.forEach((c) => {
            if (c !== conn && c.open) c.send(payload)
          })
        }
      })

      conn.on('close', () => {
        connectionsRef.current = connectionsRef.current.filter((c) => c !== conn)
        nicknameByPeerIdRef.current.delete(conn.peer)
        updateConnectedPeers()
        setConnectionCount(connectionsRef.current.length)
        setConnectionStatus(connectionsRef.current.length >= MAX_HOST_CONNECTIONS ? 'connected' : 'disconnected')
      })

      conn.on('error', (err) => {
        setError(err.message)
      })
    },
    [addMessage, updateConnectedPeers]
  )

  const setupClientConnection = useCallback(
    (conn: DataConnection) => {
      if (connRef.current) return
      connRef.current = conn
      setConnectionCount(1)
      setConnectionStatus('connected')
      setError(null)

      conn.on('data', (data: unknown) => {
        const msg = data as WireMessage
        if (!msg || typeof msg !== 'object' || !('type' in msg)) return

        // ゲームメッセージはゲームハンドラへ
        if (msg.type === 'game:action' || msg.type === 'game:state' || msg.type === 'game:reveal' || msg.type === 'game:error' || msg.type === 'game:reset') {
          onGameDataRef.current?.(conn.peer, msg as WireGameData)
          return
        }

        if (msg.type === 'join') {
          addMessage('remote', `${msg.nickname}が参加しました`, undefined, 'system')
          return
        }
        if (msg.type === 'chat') {
          addMessage('remote', msg.text, msg.nickname, 'chat')
        }
      })

      conn.on('close', () => {
        connRef.current = null
        setConnectionCount(0)
        setConnectionStatus('disconnected')
      })

      conn.on('error', (err) => {
        setError(err.message)
      })
    },
    [addMessage]
  )

  useEffect(() => {
    const peer = new Peer({
      host: '0.peerjs.com',
      secure: true,
      port: 443,
    })

    peer.on('open', (id) => {
      setMyId(id)
      setError(null)
    })

    peer.on('connection', (conn) => {
      if (role === 'host') setupHostConnection(conn)
      else setupClientConnection(conn)
    })

    peer.on('error', (err) => {
      setError(err.message)
    })

    peerRef.current = peer
    return () => {
      connRef.current?.close()
      connRef.current = null
      connectionsRef.current.forEach((c) => c.close())
      connectionsRef.current = []
      peer.destroy()
      peerRef.current = null
    }
  }, [role, setupHostConnection, setupClientConnection])

  const connect = useCallback(() => {
    const id = hostIdInput.trim()
    if (!id || !peerRef.current || role !== 'client') return
    setError(null)
    setConnectionStatus('connecting')
    const conn = peerRef.current.connect(id)
    conn.on('open', () => {
      const joinMsg: WireJoin = { type: 'join', nickname: nicknameRef.current }
      conn.send(joinMsg)
      setupClientConnection(conn)
    })
    conn.on('error', (err) => {
      setError(err.message)
      setConnectionStatus('disconnected')
    })
  }, [hostIdInput, role, setupClientConnection])

  const sendMessage = useCallback(
    (text: string) => {
      const payload: WireChat = { type: 'chat', nickname: nicknameRef.current, text }
      if (role === 'host') {
        connectionsRef.current.forEach((c) => {
          if (c.open) c.send(payload)
        })
        addMessage('me', text, nicknameRef.current, 'chat')
      } else {
        if (!connRef.current?.open) return
        connRef.current.send(payload)
        addMessage('me', text, nicknameRef.current, 'chat')
      }
    },
    [role, addMessage]
  )

  // ゲームデータ送信
  // toPeerId: 特定ピアのID または 'all'（ホストのみ all が有効）
  const sendGameData = useCallback(
    (toPeerId: string | 'all', data: WireGameData) => {
      if (role === 'host') {
        if (toPeerId === 'all') {
          connectionsRef.current.forEach((c) => { if (c.open) c.send(data) })
        } else {
          const conn = connectionsRef.current.find((c) => c.peer === toPeerId)
          if (conn?.open) conn.send(data)
        }
      } else {
        if (connRef.current?.open) connRef.current.send(data)
      }
    },
    [role]
  )

  // useGame が呼び出してゲームデータハンドラを登録する
  const setGameDataHandler = useCallback(
    (handler: (fromPeerId: string, data: WireGameData) => void) => {
      onGameDataRef.current = handler
    },
    []
  )

  const disconnect = useCallback(() => {
    if (role === 'client') {
      connRef.current?.close()
      connRef.current = null
    } else {
      connectionsRef.current.forEach((c) => c.close())
      connectionsRef.current = []
    }
    setConnectionCount(0)
    setConnectionStatus('disconnected')
  }, [role])

  return {
    myId,
    hostIdInput,
    setHostIdInput,
    messages,
    connectionStatus,
    connectionCount,
    isFullyConnected,
    error,
    connectedPeers,
    connect,
    sendMessage,
    sendGameData,
    setGameDataHandler,
    disconnect,
  }
}
