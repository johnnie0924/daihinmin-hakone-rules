import type { PeerRole } from '../hooks/usePeerChat'
import type { Card, ClientGameState } from '../types/game'
import type { RevealInfo } from '../hooks/useGame'
import GameBoard from './GameBoard'

type Props = {
  role: PeerRole
  connectionCount: number
  plannedPlayerCount: number
  canStartGame: boolean
  gameState: ClientGameState | null
  revealInfo: RevealInfo | null
  gameError: string | null
  onPlay: (cards: Card[]) => void
  onPass: () => void
  onInabauwa: (targetPeerId: string) => void
  onNextRound: () => void
  onLeaveGame: () => void
  onContinueGame: () => void
  onDismissReveal: () => void
  onClearGameError: () => void
  onStartGame: () => void
  isActive: boolean
}

function GameTab({
  role,
  connectionCount,
  plannedPlayerCount,
  canStartGame,
  gameState,
  revealInfo,
  gameError,
  onPlay,
  onPass,
  onInabauwa,
  onNextRound,
  onLeaveGame,
  onContinueGame,
  onDismissReveal,
  onClearGameError,
  onStartGame,
  isActive,
}: Props) {
  const isHost = role === 'host'

  return (
    <section className="game-section">
      {!gameState ? (
        <div className="game-waiting">
          {isHost && canStartGame ? (
            <>
              <p>接続中のプレイヤー: {connectionCount}人</p>
              <p>参加予定人数: {plannedPlayerCount}人（ホスト+クライアント+NPC）</p>
              <button className="btn-start-game" onClick={onStartGame}>
                ゲーム開始
              </button>
              <p className="game-hint">
                ※ 人間とNPCを合わせて3人揃うとゲームを開始できます（最大3人）
              </p>
            </>
          ) : isHost ? (
            <p>プレイヤーの接続を待っています...</p>
          ) : (
            <p>ホストがゲームを開始するまでお待ちください...</p>
          )}
        </div>
      ) : (
        <GameBoard
          gameState={gameState}
          revealInfo={revealInfo}
          gameError={gameError}
          isHost={isHost}
          onPlay={onPlay}
          onPass={onPass}
          onInabauwa={onInabauwa}
          onNextRound={onNextRound}
          onLeave={onLeaveGame}
          onContinue={onContinueGame}
          onDismissReveal={onDismissReveal}
          onClearError={onClearGameError}
          shortcutsEnabled={isActive}
        />
      )}
    </section>
  )
}

export default GameTab

