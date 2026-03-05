import type { Card, Suit } from '../types/game'

const SUIT_SYMBOL: Record<Suit, string> = {
  spade: '♠',
  heart: '♥',
  diamond: '♦',
  club: '♣',
}

const RANK_LABEL: Record<string | number, string> = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', joker: '🃏',
}

function isRed(suit: Suit | null): boolean {
  return suit === 'heart' || suit === 'diamond'
}

type Props = {
  card: Card
  selected?: boolean
  onClick?: () => void
  faceDown?: boolean
  small?: boolean
}

export default function CardView({ card, selected, onClick, faceDown, small }: Props) {
  const sizeClass = small ? 'card-small' : 'card-normal'
  const selectedClass = selected ? 'card-selected' : ''
  const clickableClass = onClick ? 'card-clickable' : ''

  if (faceDown) {
    return (
      <div className={`card card-back ${sizeClass} ${clickableClass}`} onClick={onClick}>
        <div className="card-back-pattern" />
      </div>
    )
  }

  if (card.rank === 'joker') {
    return (
      <div
        className={`card card-joker ${sizeClass} ${selectedClass} ${clickableClass}`}
        onClick={onClick}
      >
        <span className="card-corner card-corner-tl">JK</span>
        <span className="card-center-joker">🃏</span>
        <span className="card-corner card-corner-br card-corner-flip">JK</span>
      </div>
    )
  }

  const red = isRed(card.suit)
  const suit = card.suit!
  const colorClass = red ? 'card-red' : 'card-black'
  const rankLabel = RANK_LABEL[card.rank]
  const suitSymbol = SUIT_SYMBOL[suit]

  return (
    <div
      className={`card ${colorClass} ${sizeClass} ${selectedClass} ${clickableClass}`}
      onClick={onClick}
    >
      <span className="card-corner card-corner-tl">
        <span className="card-rank-label">{rankLabel}</span>
        <span className="card-suit-small">{suitSymbol}</span>
      </span>
      <span className="card-center-suit">{suitSymbol}</span>
      <span className="card-corner card-corner-br card-corner-flip">
        <span className="card-rank-label">{rankLabel}</span>
        <span className="card-suit-small">{suitSymbol}</span>
      </span>
    </div>
  )
}
