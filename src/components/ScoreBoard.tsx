import { useState } from 'react'
import type { ClientGameState } from '../types/game'

type Props = {
  gameState: ClientGameState
  onNextRound: () => void
  onLeave?: () => void
  onContinue?: () => void
  isHost: boolean
}

export default function ScoreBoard({ gameState, onNextRound, onLeave, onContinue, isHost }: Props) {
  const [hasVotedContinue, setHasVotedContinue] = useState(false)
  const isGameEnd = gameState.phase === 'gameEnd'
  const winner = isGameEnd
    ? gameState.players.reduce((a, b) =>
        (gameState.scores[a.peerId] ?? 0) <= (gameState.scores[b.peerId] ?? 0) ? a : b
      )
    : null

  const roundWinnerPlayer = gameState.roundWinner
    ? gameState.players.find((p) => p.peerId === gameState.roundWinner)
    : null

  const sorted = [...gameState.players].sort(
    (a, b) => (gameState.scores[a.peerId] ?? 0) - (gameState.scores[b.peerId] ?? 0)
  )

  const roundScores = gameState.roundScores ?? {}
  const totalRounds = gameState.config.roundsPerGame
  const totalScores = Object.values(gameState.scores ?? {})
  const minTotal = totalScores.length > 0 ? Math.min(...totalScores) : 0

  return (
    <div className="scoreboard">
      <h2 className="scoreboard-title">
        {isGameEnd ? 'ゲーム終了！' : `ラウンド ${gameState.round} 終了`}
      </h2>

      {roundWinnerPlayer && !isGameEnd && (
        <p className="scoreboard-round-winner">
          {roundWinnerPlayer.peerId === gameState.myPeerId ? '自分' : roundWinnerPlayer.nickname} が上がり！
        </p>
      )}

      {winner && isGameEnd && (
        <p className="scoreboard-game-winner">
          🏆 {winner.peerId === gameState.myPeerId ? '自分' : winner.nickname} の勝利！
        </p>
      )}

      <div className="scoreboard-table-wrapper">
        <table className="scoreboard-table">
          <thead>
            <tr>
              <th>プレイヤー</th>
              {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => (
                <th key={r}>R{r}</th>
              ))}
              <th>合計</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const arr = roundScores[p.peerId] ?? []
              const total = gameState.scores[p.peerId] ?? 0
              const diff = total - minTotal
              const baseName =
                p.peerId === gameState.myPeerId ? `${p.nickname}（自分）` : p.nickname
              const displayName = p.isNpc ? `${baseName}（CPU）` : baseName
              return (
                <tr key={p.peerId} className={p.peerId === gameState.myPeerId ? 'scoreboard-self' : ''}>
                  <td>{displayName}</td>
                  {Array.from({ length: totalRounds }, (_, i) => (
                    <td key={i}>
                      {i < arr.length ? arr[i] : '-'}
                    </td>
                  ))}
                  <td>
                    {total}点
                    {diff > 0 && (
                      <span className="scoreboard-diff">（+{diff}）</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!isGameEnd && (
        <p className="scoreboard-round-info">
          残り {Math.max(totalRounds - gameState.round, 0)} ラウンド
        </p>
      )}

      {isHost && !isGameEnd && (
        <button className="btn-next-round" onClick={onNextRound}>
          次のラウンドへ
        </button>
      )}
      {!isHost && !isGameEnd && (
        <p className="scoreboard-waiting">ホストが次のラウンドを開始するまでお待ちください...</p>
      )}

      {isGameEnd && onLeave != null && onContinue != null && (
        <div className="scoreboard-game-end-actions">
          <button type="button" className="btn-leave-game" onClick={onLeave}>
            退室する
          </button>
          <button
            type="button"
            className="btn-continue-game"
            onClick={() => {
              onContinue()
              setHasVotedContinue(true)
            }}
            disabled={hasVotedContinue}
          >
            続ける
          </button>
        </div>
      )}

      {isGameEnd && hasVotedContinue && (
        <p className="scoreboard-waiting">
          他のプレイヤーの続行選択を待っています…
        </p>
      )}
    </div>
  )
}
