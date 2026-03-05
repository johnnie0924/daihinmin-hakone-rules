import { useState, useCallback, useRef, useEffect } from 'react'
import type { PeerRole } from './usePeerChat'
import type {
  Card,
  ClientGameState,
  FullGameState,
  GameAction,
  WireGameData,
  GameConfig,
  NpcConfig,
} from '../types/game'
import {
  createInitialGameState,
  applyPlay, applyPass, applyInabauwa,
  finalizeRound, startNextRound,
  toClientGameState,
  DEFAULT_GAME_CONFIG,
} from './useGameEngine'
import { chooseNpcAction } from '../logic/npc'

type ConnectedPeer = { peerId: string; nickname: string }

type Props = {
  role: PeerRole
  myPeerId: string
  myNickname: string
  connectedPeers: ConnectedPeer[]
  sendGameData: (toPeerId: string | 'all', data: WireGameData) => void
  initialConfig?: GameConfig
  npcConfigs?: NpcConfig[]
}

export type RevealInfo = {
  card: Card
  fromNickname: string
  targetPeerId: string
}

export function useGame({
  role,
  myPeerId,
  myNickname,
  connectedPeers,
  sendGameData,
  initialConfig,
  npcConfigs,
}: Props) {
  const [gameState, setGameState] = useState<ClientGameState | null>(null)
  const [revealInfo, setRevealInfo] = useState<RevealInfo | null>(null)
  const [gameError, setGameError] = useState<string | null>(null)

  // ホストのみ使用する完全なゲーム状態
  const fullStateRef = useRef<FullGameState | null>(null)
  // ホスト: 続ける投票（gameEnd 後に全員揃ったら新ゲーム開始）
  const continueVotesRef = useRef<Set<string>>(new Set())
  // 現在のゲーム設定（ホストのみ使用、クライアントは受信stateのconfigを見る）
  const configRef = useRef<GameConfig | null>(null)
  // NPCの設定（ホストのみ使用）
  const npcConfigsRef = useRef<NpcConfig[] | null>(null)
  // NPCターン実行の多重防止キー
  const npcTurnKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (initialConfig) {
      configRef.current = initialConfig
    }
  }, [initialConfig])

  useEffect(() => {
    npcConfigsRef.current = npcConfigs ?? null
  }, [npcConfigs])

  const buildPlayersWithNpc = useCallback(() => {
    const humanPlayers = [
      { peerId: myPeerId, nickname: myNickname },
      ...connectedPeers,
    ]

    const maxSlots = 3
    const availableSlots = Math.max(0, maxSlots - humanPlayers.length)

    const configs = npcConfigsRef.current ?? []
    const npcPlayers = configs
      .filter((c) => c.enabled)
      .slice(0, availableSlots)
      .map((cfg) => ({
        peerId: cfg.id,
        nickname: cfg.nickname,
        isNpc: true as const,
        npcStrategy: cfg.strategy,
      }))

    return {
      humanPlayers,
      allPlayers: [...humanPlayers, ...npcPlayers],
    }
  }, [myPeerId, myNickname, connectedPeers])

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
          const { allPlayers } = buildPlayersWithNpc()
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
    [role, broadcastState, sendGameData, myPeerId, reportError, connectedPeers, myNickname, buildPlayersWithNpc]
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
    const { allPlayers } = buildPlayersWithNpc()
    if (allPlayers.length < 2) return
    const initial = createInitialGameState(
      allPlayers,
      configRef.current ?? DEFAULT_GAME_CONFIG,
    )
    broadcastState(initial)
  }, [role, buildPlayersWithNpc, broadcastState])

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

  // ────────── ホスト: NPCターンの自動実行 ──────────

  useEffect(() => {
    if (role !== 'host') return
    const full = fullStateRef.current
    if (!full || full.phase !== 'playing') {
      npcTurnKeyRef.current = null
      return
    }
    const current = full.players[full.currentPlayerIndex]
    if (!current.isNpc || !current.npcStrategy) return

    const key = `${full.round}-${full.currentPlayerIndex}-${full.field.length}-${full.deck.length}`
    if (npcTurnKeyRef.current === key) return
    npcTurnKeyRef.current = key

    const timer = window.setTimeout(() => {
      const latest = fullStateRef.current
      if (!latest || latest.phase !== 'playing') return
      const cur = latest.players[latest.currentPlayerIndex]
      if (!cur.isNpc || !cur.npcStrategy) return
      const action = chooseNpcAction(latest, cur.peerId, cur.npcStrategy)
      processAction(cur.peerId, action)
    }, 600)

    return () => {
      window.clearTimeout(timer)
    }
  }, [role, gameState?.phase, gameState?.currentPlayerIndex, processAction])

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
