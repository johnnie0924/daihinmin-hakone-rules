import { useState, useMemo, useEffect, useRef } from 'react'
import type { Card, Rank } from '../types/game'
import { cardStrength } from '../hooks/useGameEngine'
import CardView from './CardView'

type Props = {
  hand: Card[]
  revolution: boolean
  isMyTurn: boolean
  onPlay: (cards: Card[]) => void
  onPass: () => void
  onInabauwa?: () => void
  inabauwaAvailable: boolean
  disabled?: boolean
  deckCount?: number
  canPlaySelected?: boolean
  selectedSummary?: { kind: string; count: number }
  validationMessage?: string
  validationType?: 'positive' | 'negative' | 'none'
  onSelectionChange?: (selected: Card[]) => void
  shortcutsEnabled?: boolean
  afterDrawMode?: boolean
  drawnCardId?: string
}

const ENABLE_SHORTCUTS = true

export default function Hand({
  hand,
  revolution,
  isMyTurn,
  onPlay,
  onPass,
  onInabauwa,
  inabauwaAvailable,
  disabled,
  deckCount = 0,
  canPlaySelected = true,
  selectedSummary,
  validationMessage,
  validationType = 'none',
  onSelectionChange,
  shortcutsEnabled = true,
  afterDrawMode = false,
  drawnCardId,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isSorted, setIsSorted] = useState(false)
  const prevHandIdsRef = useRef<string[] | null>(null)

  useEffect(() => {
    // 手札配列の「ID の集合」が変わったときだけ選択状態をリセットする。
    // 単なる参照の変化や順序変更ではリセットしないことで、ソートなどの操作後も選択を維持する。
    const currentIds = hand.map((c) => c.id).slice().sort()
    const prev = prevHandIdsRef.current

    const hasChanged =
      !prev ||
      prev.length !== currentIds.length ||
      prev.some((id, index) => id !== currentIds[index])

    if (hasChanged) {
      setSelected(new Set())
      if (onSelectionChange) {
        onSelectionChange([])
      }
    }

    prevHandIdsRef.current = currentIds
  }, [hand, onSelectionChange])

  const displayHand = useMemo(() => {
    if (!isSorted) return hand
    return [...hand].sort((a, b) => {
      const sa = cardStrength(a.rank as Rank, revolution)
      const sb = cardStrength(b.rank as Rank, revolution)
      if (sa !== sb) return sa - sb
      const suitOrder = { spade: 0, heart: 1, diamond: 2, club: 3 }
      const aSuit = a.suit ? suitOrder[a.suit] : -1
      const bSuit = b.suit ? suitOrder[b.suit] : -1
      return aSuit - bSuit
    })
  }, [hand, isSorted, revolution])

  const toggleCard = (cardId: string) => {
    if (!isMyTurn || disabled) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      if (onSelectionChange) {
        const nextCards = hand.filter(c => next.has(c.id))
        onSelectionChange(nextCards)
      }
      return next
    })
  }

  const handlePlay = () => {
    const cards = hand.filter(c => selected.has(c.id))
    if (cards.length === 0) return
    onPlay(cards)
    setSelected(new Set())
    if (onSelectionChange) {
      onSelectionChange([])
    }
  }

  const handlePass = () => {
    setSelected(new Set())
    onPass()
    if (onSelectionChange) {
      onSelectionChange([])
    }
  }

  const selectedCards = hand.filter(c => selected.has(c.id))

  useEffect(() => {
    if (!ENABLE_SHORTCUTS) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shortcutsEnabled || !isMyTurn || disabled) return

      const active = document.activeElement as HTMLElement | null
      if (active) {
        const tag = active.tagName
        const isTypingTarget =
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          active.getAttribute('contenteditable') === 'true'
        if (isTypingTarget) return
      }

      if (event.key === 'Enter') {
        if (selectedCards.length > 0 && canPlaySelected) {
          event.preventDefault()
          handlePlay()
        }
      } else if (event.key === 'p' || event.key === 'P') {
        event.preventDefault()
        handlePass()
      } else if (event.key === 'i' || event.key === 'I') {
        if (inabauwaAvailable && onInabauwa) {
          event.preventDefault()
          onInabauwa()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    shortcutsEnabled,
    isMyTurn,
    disabled,
    selectedCards.length,
    canPlaySelected,
    inabauwaAvailable,
    onInabauwa,
    handlePlay,
    handlePass,
  ])

  return (
    <div className="hand-area">
      <div className="hand-toolbar">
        <button
          type="button"
          className="btn-sort-hand"
          onClick={() => setIsSorted((v) => !v)}
        >
          {isSorted ? '元に戻す' : '並び替え'}
        </button>
      </div>
      <div className="hand-cards">
        {displayHand.map(card => (
          <CardView
            key={card.id}
            card={card}
            selected={selected.has(card.id)}
            onClick={() => toggleCard(card.id)}
            highlighted={afterDrawMode && drawnCardId === card.id}
          />
        ))}
      </div>
      {isMyTurn && !disabled && (
        <>
          <div className="hand-actions">
            <button
              className="btn-play"
              onClick={handlePlay}
              disabled={selectedCards.length === 0 || !canPlaySelected}
            >
              {selectedSummary
                ? `出す（${selectedSummary.count}枚・${selectedSummary.kind}）`
                : `出す (${selectedCards.length}枚)`}
            </button>
            <button className="btn-pass" onClick={handlePass}>
              {deckCount > 0
                ? afterDrawMode
                  ? '出さない'
                  : 'ドロー→出さない'
                : 'パス'}
            </button>
            {inabauwaAvailable && onInabauwa && (
              <button className="btn-inabauwa" onClick={onInabauwa}>
                イナバウワー
              </button>
            )}
          </div>
          <p className="hand-shortcut-hint">
            ショートカット: Enter = 出す / P = ドロー→出さない / I = イナバウワー
          </p>
          {afterDrawMode && (
            <p className="hand-after-draw-hint">
              さっき引いたカードを含む手なら、このターン中に出せます
            </p>
          )}
        </>
      )}
      {isMyTurn && !disabled && validationMessage && selectedCards.length > 0 && (
        <p
          className={
            validationType === 'positive'
              ? 'hand-validation-message hand-validation-message-positive'
              : 'hand-validation-message'
          }
        >
          {validationMessage}
        </p>
      )}
      {!isMyTurn && (
        <p className="hand-waiting">他のプレイヤーの手番です...</p>
      )}
    </div>
  )
}
