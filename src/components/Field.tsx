import type { FieldEntry, Suit } from '../types/game'
import CardView from './CardView'

const SUIT_SYMBOL: Record<Suit, string> = {
  spade: '♠', heart: '♥', diamond: '♦', club: '♣',
}

type Props = {
  field: FieldEntry[]
  suitLock: Suit | null
  deckCount: number
  playerNickname: (peerId: string) => string
}

export default function Field({ field, suitLock, deckCount, playerNickname }: Props) {
  const top = field.length > 0 ? field[field.length - 1] : null

  return (
    <div className="field-area">
      <div className="field-badges">
        {/* 革命中・11バックの全体状態は GameBoard ヘッダ側に集約し、
            フィールド側では縛りと山札のみ表示する */}
        {suitLock && <span className="badge badge-suit">縛り {SUIT_SYMBOL[suitLock]}</span>}
        <span className="badge badge-deck">山札 {deckCount}枚</span>
      </div>

      {top ? (
        <div className="field-top">
          <p className="field-player-label">{playerNickname(top.playerId)} が出した手</p>
          <div className="field-cards">
            {top.cards.map(card => (
              <CardView key={card.id} card={card} small />
            ))}
          </div>
        </div>
      ) : (
        <div className="field-empty">
          <p>場は空です。何でも出せます。</p>
        </div>
      )}
    </div>
  )
}
