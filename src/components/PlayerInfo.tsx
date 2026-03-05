import type { ClientPlayerState } from '../types/game'

type Props = {
  player: ClientPlayerState
  isCurrentPlayer: boolean
  isSelf: boolean
  score: number
  onInabauwa?: () => void
  inabauwaEnabled: boolean
}

export default function PlayerInfo({ player, isCurrentPlayer, isSelf, score, onInabauwa, inabauwaEnabled }: Props) {
  return (
    <div className={`player-info ${isCurrentPlayer ? 'player-info-active' : ''} ${isSelf ? 'player-info-self' : ''}`}>
      <span className="player-name">
        {isSelf ? '自分' : player.nickname}
        {player.isNpc && '（CPU）'}
        {isCurrentPlayer && ' 🎯'}
        {player.passedThisTrick && ' (パス)'}
      </span>
      <span className="player-hand-count">{player.handCount}枚</span>
      <span className="player-score">{score}点</span>
      {!isSelf && inabauwaEnabled && onInabauwa && (
        <button className="btn-inabauwa-target" onClick={onInabauwa}>
          イナバウワー
        </button>
      )}
    </div>
  )
}
