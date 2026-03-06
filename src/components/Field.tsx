import type { FieldEntry, HandKind, Suit } from '../types/game'
import CardView from './CardView'

const SUIT_SYMBOL: Record<Suit, string> = {
  spade: '♠', heart: '♥', diamond: '♦', club: '♣',
}

const HAND_KIND_LABEL: Record<HandKind, string> = {
  single: '1枚',
  pair: 'ペア',
  triple: '3枚',
  stair: '階段',
}

type Props = {
  field: FieldEntry[]
  suitLock: Suit | null
  deckCount: number
  playerNickname: (peerId: string) => string
}

export default function Field({ field, suitLock, deckCount, playerNickname: _playerNickname }: Props) {
  const len = field.length
  const top = len > 0 ? field[len - 1] : null
  const historyEntries = len === 0 ? [] : field.slice(-3).reverse()

  return (
    <div className="field-area">
      <div className="field-badges">
        {suitLock && <span className="badge badge-suit">縛り {SUIT_SYMBOL[suitLock]}</span>}
        <span className="badge badge-deck">山札 {deckCount}枚</span>
      </div>

      {top ? (
        <div className="field-history">
          {historyEntries.map((entry, i) => (
            <span key={`${entry.playerId}-${i}-${entry.cards.map(c => c.id).join(',')}`} className="field-history-wrap">
              {i > 0 && <span className="field-history-arrow" aria-hidden>←</span>}
              <div className={`field-history-item ${i > 0 ? 'field-history-item--old' : ''}`}>
                <span className="field-history-kind">{HAND_KIND_LABEL[entry.kind]}</span>
                <div className="field-cards">
                  {entry.cards.map(card => (
                    <CardView key={card.id} card={card} small />
                  ))}
                </div>
              </div>
            </span>
          ))}
        </div>
      ) : (
        <div className="field-empty">
          <p>場は空です。何でも出せます。</p>
        </div>
      )}
    </div>
  )
}
