import { useEffect, useRef } from 'react'
import type { PeerRole } from './usePeerChat'
import type { ClientGameState } from '../types/game'

export function useResetGameOnDisconnect(
  connectionCount: number,
  role: PeerRole,
  gameState: ClientGameState | null,
  resetGame: () => void,
) {
  const prevConnectionCountRef = useRef(connectionCount)

  useEffect(() => {
    const hadGame = gameState != null
    const countDropped = connectionCount < prevConnectionCountRef.current

    if (hadGame && countDropped) {
      const minRequired = role === 'host' ? 2 : 1
      if (connectionCount < minRequired) {
        resetGame()
      }
    }

    prevConnectionCountRef.current = connectionCount
  }, [connectionCount, role, gameState, resetGame])
}

