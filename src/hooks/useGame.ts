import { useState, useCallback, useRef, useEffect } from 'react'
import type { PeerRole } from './usePeerChat'
import type {
  Card, ClientGameState, FullGameState, GameAction, WireGameData, GameConfig,
} from '../types/game'
import {
  createInitialGameState,
  applyPlay, applyPass, applyInabauwa,
  finalizeRound, startNextRound,
  toClientGameState,
  DEFAULT_GAME_CONFIG,
} from './useGameEngine'

type ConnectedPeer = { peerId: string; nickname: string }

type Props = {
  role: PeerRole
  myPeerId: string
  myNickname: string
  connectedPeers: ConnectedPeer[]
  sendGameData: (toPeerId: string | 'all', data: WireGameData) => void
  initialConfig?: GameConfig
}

export type RevealInfo = {
  card: Card
  fromNickname: string
  targetPeerId: string
}

export function useGame({ role, myPeerId, myNickname, connectedPeers, sendGameData, initialConfig }: Props) {
  const [gameState, setGameState] = useState<ClientGameState | null>(null)
  const [revealInfo, setRevealInfo] = useState<RevealInfo | null>(null)
  const [gameError, setGameError] = useState<string | null>(null)

  // ホストのみ使用する完全なゲーム状態
  const fullStateRef = useRef<FullGameState | null>(null)
  // ホスト: 続ける投票（gameEnd 後に全員揃ったら新ゲーム開始）
  const continueVotesRef = useRef<Set<string>>(new Set())
  // 現在のゲーム設定（ホストのみ使用、クライアントは受信stateのconfigを見る）
  const configRef = useRef<GameConfig | null>(null)

  useEffect(() => {
    if (initialConfig) {
      configRef.current = initialConfig
    }
  }, [initialConfig])

  // エラーを出したプレイヤーにのみ通知（ホストはローカル、クライアントは送信）
  const reportError = useCallback(
    (fromPeerId: string, message: string) => {
      if (fromPeerId === myPeerId) {
        setGameError(message)
      } else {
        sendGameData(fromPeerId, { type: 'game:error', message })
      }
    },
    [myPeerId, sendGameData]
  )

  // ────────── ホスト: 状態をブロードキャスト ──────────

  const broadcastState = useCallback(
    (full: FullGameState) => {
      fullStateRef.current = full
      // 各クライアントにそのクライアント専用の状態を送信
      full.players.forEach((p) => {
        const clientState = toClientGameState(full, p.peerId)
        if (p.peerId === myPeerId) {
          setGameState(clientState)
        } else {
          sendGameData(p.peerId, { type: 'game:state', state: clientState })
        }
      })
    },
    [myPeerId, sendGameData]
  )

  // ────────── ホスト: アクション処理 ──────────

  const processAction = useCallback(
    (fromPeerId: string, action: GameAction) => {
      if (role !== 'host' || !fullStateRef.current) return
      const state = fullStateRef.current

      if (action.kind === 'play') {
        const result = applyPlay(state, fromPeerId, action.cards)
        if ('error' in result) {
          reportError(fromPeerId, result.error)
          return
        }
        const next = result.phase === 'roundEnd' ? finalizeRound(result) : result
        broadcastState(next)
        return
      }

      if (action.kind === 'pass') {
        const result = applyPass(state, fromPeerId)
        if ('error' in result) {
          reportError(fromPeerId, result.error)
          return
        }
        broadcastState(result)
        return
      }

      if (action.kind === 'inabauwa') {
        const result = applyInabauwa(state, fromPeerId, action.targetPeerId)
        if ('error' in result) {
          reportError(fromPeerId, result.error)
          return
        }
        const actorNickname =
          result.state.players.find((p) => p.peerId === fromPeerId)?.nickname ?? fromPeerId
        broadcastState(result.state)
        // 全員にカードを公開
        result.state.players.forEach((p) => {
          const reveal: WireGameData = {
            type: 'game:reveal',
            card: result.revealedCard,
            fromNickname: actorNickname,
            targetPeerId: action.targetPeerId,
          }
          if (p.peerId === myPeerId) {
            setRevealInfo({ card: result.revealedCard, fromNickname: actorNickname, targetPeerId: action.targetPeerId })
          } else {
            sendGameData(p.peerId, reveal)
          }
        })
        return
      }

      if (action.kind === 'nextRound') {
        if (state.phase === 'roundEnd') {
          broadcastState(startNextRound(state))
        }
        return
      }

      if (action.kind === 'continue') {
        if (state.phase !== 'gameEnd') return
        continueVotesRef.current.add(fromPeerId)
        const allPlayerIds = new Set([myPeerId, ...connectedPeers.map((p) => p.peerId)])
        if (continueVotesRef.current.size >= allPlayerIds.size && [...continueVotesRef.current].every((id) => allPlayerIds.has(id))) {
          continueVotesRef.current.clear()
          const allPlayers: ConnectedPeer[] = [
            { peerId: myPeerId, nickname: myNickname },
            ...connectedPeers,
          ]
          if (allPlayers.length >= 2) {
            const initial = createInitialGameState(
              allPlayers,
              configRef.current ?? DEFAULT_GAME_CONFIG,
            )
            broadcastState(initial)
          }
        }
        return
      }
    },
    [role, broadcastState, sendGameData, myPeerId, reportError, connectedPeers, myNickname]
  )

  // ────────── 受信ハンドラ（usePeerChat から呼ばれる） ──────────

  const handleGameData = useCallback(
    (fromPeerId: string, data: WireGameData) => {
      if (data.type === 'game:state') {
        setGameState(data.state)
        return
      }
      if (data.type === 'game:action') {
        processAction(fromPeerId, data.action)
        return
      }
      if (data.type === 'game:reveal') {
        setRevealInfo({ card: data.card, fromNickname: data.fromNickname, targetPeerId: data.targetPeerId })
        return
      }
      if (data.type === 'game:error') {
        setGameError(data.message)
        return
      }
      if (data.type === 'game:reset') {
        continueVotesRef.current.clear()
        setGameState(null)
        return
      }
    },
    [processAction]
  )

  // ────────── 外部から呼ぶアクション ──────────

  const startGame = useCallback(() => {
    if (role !== 'host') return
    const allPlayers: ConnectedPeer[] = [
      { peerId: myPeerId, nickname: myNickname },
      ...connectedPeers,
    ]
    if (allPlayers.length < 2) return
    const initial = createInitialGameState(
      allPlayers,
      configRef.current ?? DEFAULT_GAME_CONFIG,
    )
    broadcastState(initial)
  }, [role, myPeerId, myNickname, connectedPeers, broadcastState])

  const playCards = useCallback(
    (cards: Card[]) => {
      const action: GameAction = { kind: 'play', cards }
      if (role === 'host') {
        processAction(myPeerId, action)
      } else {
        sendGameData('all', { type: 'game:action', action })
      }
    },
    [role, myPeerId, processAction, sendGameData]
  )

  const pass = useCallback(() => {
    const action: GameAction = { kind: 'pass' }
    if (role === 'host') {
      processAction(myPeerId, action)
    } else {
      sendGameData('all', { type: 'game:action', action })
    }
  }, [role, myPeerId, processAction, sendGameData])

  const useInabauwa = useCallback(
    (targetPeerId: string) => {
      const action: GameAction = { kind: 'inabauwa', targetPeerId }
      if (role === 'host') {
        processAction(myPeerId, action)
      } else {
        sendGameData('all', { type: 'game:action', action })
      }
    },
    [role, myPeerId, processAction, sendGameData]
  )

  const nextRound = useCallback(() => {
    const action: GameAction = { kind: 'nextRound' }
    if (role === 'host') {
      processAction(myPeerId, action)
    } else {
      sendGameData('all', { type: 'game:action', action })
    }
  }, [role, myPeerId, processAction, sendGameData])

  const dismissReveal = useCallback(() => setRevealInfo(null), [])
  const clearGameError = useCallback(() => setGameError(null), [])

  const resetGame = useCallback(() => {
    fullStateRef.current = null
    continueVotesRef.current.clear()
    setGameState(null)
    if (role === 'host') {
      connectedPeers.forEach((p) => sendGameData(p.peerId, { type: 'game:reset' }))
    }
  }, [role, connectedPeers, sendGameData])

  const continueGame = useCallback(() => {
    const action: GameAction = { kind: 'continue' }
    if (role === 'host') {
      processAction(myPeerId, action)
    } else {
      sendGameData('all', { type: 'game:action', action })
    }
  }, [role, myPeerId, processAction, sendGameData])

  return {
    gameState,
    revealInfo,
    gameError,
    handleGameData,
    startGame,
    playCards,
    pass,
    useInabauwa,
    nextRound,
    dismissReveal,
    clearGameError,
    resetGame,
    continueGame,
  }
}
