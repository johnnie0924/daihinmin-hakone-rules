import type { Card, FullGameState, GameAction, HandKind, NpcStrategy } from '../types/game'
import { analyzeHand, canPlay } from '../hooks/useGameEngine'

type Candidate = {
  cards: Card[]
  strength: number
  kind: HandKind
}

const MAX_COMBINATION_SIZE = 5

function* combinations<T>(items: T[], maxSize: number): Generator<T[]> {
  const n = items.length
  const limit = Math.min(maxSize, n)

  function* backtrack(start: number, current: T[]): Generator<T[]> {
    if (current.length > 0) {
      yield current.slice()
    }
    if (current.length === limit) return
    for (let i = start; i < n; i++) {
      current.push(items[i])
      yield* backtrack(i + 1, current)
      current.pop()
    }
  }

  yield* backtrack(0, [])
}

function collectCandidates(state: FullGameState, playerId: string): Candidate[] {
  const player = state.players.find((p) => p.peerId === playerId)
  if (!player) return []

  const effectiveRev = state.revolution !== state.elevenBack
  const fieldTop = state.field.length > 0 ? state.field[state.field.length - 1] : null

  const pending = state.pendingDraw
  const requiredCardId =
    pending && pending.playerId === playerId ? pending.cardId : null

  const result: Candidate[] = []

  for (const cards of combinations(player.hand, MAX_COMBINATION_SIZE)) {
    if (requiredCardId && !cards.some((c) => c.id === requiredCardId)) {
      continue
    }
    const analysis = analyzeHand(cards, effectiveRev)
    if (!analysis || !analysis.valid) continue
    if (!canPlay(analysis, fieldTop, state.suitLock, effectiveRev)) continue
    result.push({
      cards,
      strength: analysis.strength,
      kind: analysis.kind,
    })
  }

  return result
}

export function chooseNpcAction(
  state: FullGameState,
  playerId: string,
  strategy: NpcStrategy,
): GameAction {
  const candidates = collectCandidates(state, playerId)
  if (candidates.length === 0) {
    return { kind: 'pass' }
  }

  let chosen: Candidate

  if (strategy === 'aggressive') {
    // 強い手・枚数が多い手を優先
    chosen = candidates.reduce((best, cur) => {
      if (cur.strength !== best.strength) {
        return cur.strength > best.strength ? cur : best
      }
      if (cur.cards.length !== best.cards.length) {
        return cur.cards.length > best.cards.length ? cur : best
      }
      return best
    })
  } else if (strategy === 'random') {
    const idx = Math.floor(Math.random() * candidates.length)
    chosen = candidates[idx]
  } else {
    // balanced: できるだけ弱く・枚数も控えめに出す
    chosen = candidates.reduce((best, cur) => {
      if (cur.strength !== best.strength) {
        return cur.strength < best.strength ? cur : best
      }
      if (cur.cards.length !== best.cards.length) {
        return cur.cards.length < best.cards.length ? cur : best
      }
      return best
    })
  }

  return {
    kind: 'play',
    cards: chosen.cards,
  }
}

