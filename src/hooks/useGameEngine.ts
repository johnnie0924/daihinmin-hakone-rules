import type {
  Card, Suit, Rank, HandKind, FieldEntry,
  FullGameState, FullPlayerState, ClientGameState, SpecialEvent, GameConfig,
} from '../types/game'

// ────────── デッキ生成・シャッフル ──────────

const SUITS: Suit[] = ['spade', 'heart', 'diamond', 'club']
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
const CARDS_PER_PLAYER = 5

export const DEFAULT_GAME_CONFIG: GameConfig = {
  roundsPerGame: 5,
  enableSwitchback: true,
  enableEruption: true,
  enableTenkanoken: true,
  enableOldRoad: true,
  enableSekisho: true,
}

export function createDeck(): Card[] {
  const cards: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ suit, rank, id: `${suit}-${rank}` })
    }
  }
  cards.push({ suit: null, rank: 'joker', id: 'joker' })
  return cards
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ────────── カードの強さ ──────────
// 通常: 3=1, 4=2, ..., K=11, A=12, 2=13, Joker=15
// 革命中: 3=13, 4=12, ..., 2=1, Joker=15 (常に最強)

const NORMAL_STRENGTH: Record<number, number> = {
  3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7,
  10: 8, 11: 9, 12: 10, 13: 11, 1: 12, 2: 13,
}

export function cardStrength(rank: Rank, rev: boolean): number {
  if (rank === 'joker') return 15
  const base = NORMAL_STRENGTH[rank as number]
  return rev ? 14 - base : base
}

// ────────── 手の解析 ──────────

export type HandAnalysis = {
  kind: HandKind
  strength: number
  suit: Suit | null
  valid: boolean
}

export function analyzeHand(cards: Card[], rev: boolean): HandAnalysis | null {
  if (cards.length === 0) return null

  const nonJokers = cards.filter(c => c.rank !== 'joker')
  const jokerCount = cards.length - nonJokers.length

  if (cards.length === 1) {
    const c = cards[0]
    return { kind: 'single', strength: cardStrength(c.rank, rev), suit: c.suit, valid: true }
  }

  if (cards.length === 2) {
    if (jokerCount === 2) {
      return { kind: 'pair', strength: 15, suit: null, valid: true }
    }
    if (jokerCount === 1) {
      const c = nonJokers[0]
      return { kind: 'pair', strength: cardStrength(c.rank, rev), suit: c.suit, valid: true }
    }
    if (nonJokers[0].rank === nonJokers[1].rank) {
      const suits = new Set(nonJokers.map(c => c.suit))
      return {
        kind: 'pair',
        strength: cardStrength(nonJokers[0].rank, rev),
        suit: suits.size === 1 ? nonJokers[0].suit : null,
        valid: true,
      }
    }
    return null
  }

  if (cards.length === 3) {
    // Triple チェック
    const tripleResult = tryTriple(cards, nonJokers, jokerCount, rev)
    if (tripleResult) return tripleResult
    // Stair チェック
    return tryStair(nonJokers, jokerCount, rev)
  }

  if (cards.length >= 4) {
    // 4枚以上: Triple（4枚同種=革命用）またはStair
    const tripleResult = tryTriple(cards, nonJokers, jokerCount, rev)
    if (tripleResult) return tripleResult
    return tryStair(nonJokers, jokerCount, rev)
  }

  return null
}

function tryTriple(
  _cards: Card[],
  nonJokers: Card[],
  _jokerCount: number,
  rev: boolean,
): HandAnalysis | null {
  if (nonJokers.length === 0) {
    return { kind: 'triple', strength: 15, suit: null, valid: true }
  }
  const uniqueRanks = new Set(nonJokers.map(c => c.rank))
  if (uniqueRanks.size === 1) {
    return {
      kind: 'triple',
      strength: cardStrength(nonJokers[0].rank, rev),
      suit: null,
      valid: true,
    }
  }
  // 1ジョーカー + 2枚異なるランクはトリプル不可
  return null
}

function tryStair(
  nonJokers: Card[],
  jokerCount: number,
  rev: boolean,
): HandAnalysis | null {
  if (nonJokers.length === 0) return null

  const suits = new Set(nonJokers.map(c => c.suit))
  if (suits.size !== 1) return null
  const suit = nonJokers[0].suit

  const strengths = nonJokers
    .map(c => cardStrength(c.rank, rev))
    .sort((a, b) => a - b)

  // 重複チェック
  for (let i = 1; i < strengths.length; i++) {
    if (strengths[i] === strengths[i - 1]) return null
  }

  // ジョーカーで埋められるギャップ数
  let gaps = 0
  for (let i = 1; i < strengths.length; i++) {
    gaps += strengths[i] - strengths[i - 1] - 1
  }
  if (gaps > jokerCount) return null

  const topStrength = strengths[strengths.length - 1] + (jokerCount - gaps)

  return { kind: 'stair', strength: topStrength, suit, valid: true }
}

// ────────── プレイ可否チェック ──────────

export function canPlay(
  played: HandAnalysis,
  fieldTop: FieldEntry | null,
  suitLock: Suit | null,
): boolean {
  if (!fieldTop) return true
  if (played.kind !== fieldTop.kind) return false

  // 階段は枚数も同じでなければならない（strengthで区別）
  if (played.strength <= fieldTop.strength) return false

  if (suitLock) {
    // ジョーカーのみの手はスートロックを通過
    const nonJokerSuits = new Set(
      played.suit !== null ? [played.suit] : [],
    )
    if (nonJokerSuits.size > 0 && !nonJokerSuits.has(suitLock)) return false
  }

  return true
}

// ────────── 特殊効果判定 ──────────

export function isRevolution(cards: Card[]): boolean {
  const nonJokers = cards.filter(c => c.rank !== 'joker')
  if (nonJokers.length < 4) return false
  const uniqueRanks = new Set(nonJokers.map(c => c.rank))
  return uniqueRanks.size === 1
}

export function is8Cut(cards: Card[]): boolean {
  return cards.some(c => c.rank === 8)
}

export function isElevenBack(cards: Card[]): boolean {
  return cards.some(c => c.rank === 11)
}

// ────────── スコア計算 ──────────

export function cardScore(card: Card): number {
  if (card.rank === 'joker') return 10
  if (card.rank === 1 || card.rank === 11 || card.rank === 12 || card.rank === 13) return 10
  return card.rank as number
}

export function handScore(hand: Card[]): number {
  return hand.reduce((sum, c) => sum + cardScore(c), 0)
}

// ────────── ゲーム状態の初期化 ──────────

export function createInitialGameState(
  players: { peerId: string; nickname: string }[],
  config: GameConfig = DEFAULT_GAME_CONFIG,
): FullGameState {
  const deck = shuffle(createDeck())
  const cardsEach = CARDS_PER_PLAYER
  const hands = players.map((_, i) => deck.slice(i * cardsEach, (i + 1) * cardsEach))
  const remainingDeck = deck.slice(players.length * cardsEach)
  const parentIndex = Math.floor(Math.random() * players.length)

  return {
    phase: 'playing',
    round: 1,
    currentPlayerIndex: parentIndex,
    parentIndex,
    field: [],
    players: players.map((p, i) => ({
      peerId: p.peerId,
      nickname: p.nickname,
      hand: hands[i],
      handCount: hands[i].length,
      passedThisTrick: false,
    })),
    deck: remainingDeck,
    revolution: false,
    elevenBack: false,
    suitLock: null,
    scores: Object.fromEntries(players.map(p => [p.peerId, 0])),
    roundScores: {},
    inabauwaUsed: [],
    roundWinner: null,
    consecutivePasses: 0,
    lastEvent: 'none',
    config,
  }
}

// ────────── 次のプレイヤー ──────────

function nextPlayer(players: FullPlayerState[], current: number): number {
  const n = players.length
  let next = (current + 1) % n
  let safety = 0
  while (players[next].passedThisTrick && safety < n) {
    next = (next + 1) % n
    safety++
  }
  return next
}

// ────────── アクション適用 ──────────

export function applyPlay(
  state: FullGameState,
  playerId: string,
  cards: Card[],
): FullGameState | { error: string } {
  const playerIdx = state.players.findIndex(p => p.peerId === playerId)
  if (playerIdx !== state.currentPlayerIndex) return { error: '自分のターンではありません' }

  const effectiveRev = state.revolution !== state.elevenBack
  const analysis = analyzeHand(cards, effectiveRev)
  if (!analysis || !analysis.valid) return { error: '無効な手です' }

  const fieldTop = state.field.length > 0 ? state.field[state.field.length - 1] : null
  if (!canPlay(analysis, fieldTop, state.suitLock)) return { error: 'その手は出せません' }

  const player = state.players[playerIdx]
  const cardIdSet = new Set(cards.map(c => c.id))
  if (!cards.every(c => player.hand.some(h => h.id === c.id))) {
    return { error: '手札にないカードです' }
  }

  const newHand = player.hand.filter(c => !cardIdSet.has(c.id))

  const fieldEntry: FieldEntry = {
    cards,
    kind: analysis.kind,
    strength: analysis.strength,
    suit: analysis.suit,
    playerId,
  }

  let newRevolution = state.revolution
  let newElevenBack = state.elevenBack
  let newSuitLock = state.suitLock
  let clearField = false
  let newLastEvent: SpecialEvent = 'none'
  let nextIdx = nextPlayer(
    state.players.map((p, i) => (i === playerIdx ? { ...p, passedThisTrick: false } : p)),
    playerIdx,
  )
  let newParentIndex = state.parentIndex

  // 革命チェック
  if (state.config.enableTenkanoken && isRevolution(cards)) {
    newRevolution = !newRevolution
    newLastEvent = 'tenkanoken'
  }

  // 8切り
  if (state.config.enableEruption && is8Cut(cards)) {
    clearField = true
    nextIdx = playerIdx
    newParentIndex = playerIdx
    newElevenBack = false
    newSuitLock = null
    newLastEvent = 'eruption'
  }

  // 11バック
  if (!clearField && state.config.enableSwitchback && isElevenBack(cards)) {
    newElevenBack = !newElevenBack
    newLastEvent = 'switchback'
  }

  // 縛り: 今の手と前の手が同スートなら縛り発動
  if (!clearField && state.config.enableSekisho && fieldTop && analysis.suit && fieldTop.suit === analysis.suit) {
    newSuitLock = analysis.suit
    newLastEvent = 'sekisho'
  }

  // 階段: 手の種類が stair の場合
  if (!clearField && state.config.enableOldRoad && analysis.kind === 'stair' && newLastEvent === 'none') {
    newLastEvent = 'oldRoad'
  }

  const newPlayers: FullPlayerState[] = state.players.map((p, i) => {
    if (i === playerIdx) return { ...p, hand: newHand, handCount: newHand.length, passedThisTrick: false }
    return clearField ? { ...p, passedThisTrick: false } : p
  })

  let newPhase = state.phase
  let roundWinner = state.roundWinner
  if (newHand.length === 0) {
    newPhase = 'roundEnd'
    roundWinner = playerId
  }

  return {
    ...state,
    phase: newPhase,
    field: clearField ? [] : [...state.field, fieldEntry],
    players: newPlayers,
    revolution: newRevolution,
    elevenBack: clearField ? false : newElevenBack,
    suitLock: clearField ? null : newSuitLock,
    currentPlayerIndex: newPhase === 'roundEnd' ? playerIdx : nextIdx,
    parentIndex: clearField ? newParentIndex : state.parentIndex,
    consecutivePasses: 0,
    roundWinner,
    lastEvent: newLastEvent,
  }
}

export function applyPass(
  state: FullGameState,
  playerId: string,
): FullGameState | { error: string } {
  const playerIdx = state.players.findIndex(p => p.peerId === playerId)
  if (playerIdx !== state.currentPlayerIndex) return { error: '自分のターンではありません' }

  let newDeck = [...state.deck]
  let drawnCard: Card | null = null
  if (newDeck.length > 0) {
    drawnCard = newDeck[0]
    newDeck = newDeck.slice(1)
  }

  const newPlayers: FullPlayerState[] = state.players.map((p, i) => {
    if (i !== playerIdx) return p
    const newHand = drawnCard ? [...p.hand, drawnCard] : p.hand
    return { ...p, hand: newHand, handCount: newHand.length, passedThisTrick: true }
  })

  const activePlayers = newPlayers.filter(p => !p.passedThisTrick)
  const trickOver = activePlayers.length <= 1

  let newField = state.field
  let newSuitLock = state.suitLock
  let newElevenBack = state.elevenBack
  let newParentIndex = state.parentIndex
  let nextIdx = nextPlayer(newPlayers, playerIdx)

  if (trickOver) {
    newField = []
    newSuitLock = null
    newElevenBack = false
    // 最後に出したプレイヤーが次の親
    if (state.field.length > 0) {
      const lastPlayerId = state.field[state.field.length - 1].playerId
      const lastPlayerIdx = newPlayers.findIndex(p => p.peerId === lastPlayerId)
      newParentIndex = lastPlayerIdx >= 0 ? lastPlayerIdx : state.parentIndex
    }
    nextIdx = newParentIndex
  }

  return {
    ...state,
    deck: newDeck,
    players: trickOver ? newPlayers.map(p => ({ ...p, passedThisTrick: false })) : newPlayers,
    field: newField,
    suitLock: newSuitLock,
    elevenBack: newElevenBack,
    parentIndex: newParentIndex,
    currentPlayerIndex: nextIdx,
    consecutivePasses: trickOver ? 0 : state.consecutivePasses + 1,
    lastEvent: 'none',
  }
}

export function applyInabauwa(
  state: FullGameState,
  actorId: string,
  targetId: string,
): { state: FullGameState; revealedCard: Card } | { error: string } {
  if (state.inabauwaUsed.includes(actorId)) return { error: 'イナバウワーは既に使用済みです' }
  if (actorId === targetId) return { error: '自分自身は指名できません' }

  const target = state.players.find(p => p.peerId === targetId)
  if (!target || target.hand.length === 0) return { error: '対象プレイヤーの手札がありません' }

  const idx = Math.floor(Math.random() * target.hand.length)
  const revealedCard = target.hand[idx]

  return {
    state: { ...state, inabauwaUsed: [...state.inabauwaUsed, actorId] },
    revealedCard,
  }
}

// ────────── ラウンド終了処理 ──────────

export function finalizeRound(state: FullGameState): FullGameState {
  const newScores = { ...state.scores }
  for (const p of state.players) {
    if (p.hand.length > 0) {
      newScores[p.peerId] = (newScores[p.peerId] ?? 0) + handScore(p.hand)
    }
  }
  const newRoundScores = { ...state.roundScores }
  for (const p of state.players) {
    const oldTotal = state.scores[p.peerId] ?? 0
    const newTotal = newScores[p.peerId] ?? 0
    const roundPoints = newTotal - oldTotal
    const arr = [...(newRoundScores[p.peerId] ?? [])]
    arr.push(roundPoints)
    newRoundScores[p.peerId] = arr
  }
  const isLastRound = state.round >= state.config.roundsPerGame
  return {
    ...state,
    scores: newScores,
    roundScores: newRoundScores,
    phase: isLastRound ? 'gameEnd' : 'roundEnd',
    lastEvent: 'none',
  }
}

export function startNextRound(state: FullGameState): FullGameState {
  const deck = shuffle(createDeck())
  const cardsEach = CARDS_PER_PLAYER
  const hands = state.players.map((_, i) => deck.slice(i * cardsEach, (i + 1) * cardsEach))
  const remainingDeck = deck.slice(state.players.length * cardsEach)
  const nextParent = (state.parentIndex + 1) % state.players.length

  return {
    ...state,
    phase: 'playing',
    round: state.round + 1,
    currentPlayerIndex: nextParent,
    parentIndex: nextParent,
    field: [],
    players: state.players.map((p, i) => ({
      ...p,
      hand: hands[i],
      handCount: hands[i].length,
      passedThisTrick: false,
    })),
    deck: remainingDeck,
    revolution: false,
    elevenBack: false,
    suitLock: null,
    roundScores: state.roundScores,
    roundWinner: null,
    consecutivePasses: 0,
    lastEvent: 'none',
  }
}

// ────────── クライアント向け状態変換 ──────────

export function toClientGameState(state: FullGameState, forPeerId: string): ClientGameState {
  return {
    phase: state.phase,
    round: state.round,
    currentPlayerIndex: state.currentPlayerIndex,
    parentIndex: state.parentIndex,
    field: state.field,
    players: state.players.map(p => ({
      peerId: p.peerId,
      nickname: p.nickname,
      hand: p.peerId === forPeerId ? p.hand : [],
      handCount: p.handCount,
      passedThisTrick: p.passedThisTrick,
    })),
    deckCount: state.deck.length,
    revolution: state.revolution,
    elevenBack: state.elevenBack,
    suitLock: state.suitLock,
    scores: state.scores,
    roundScores: state.roundScores,
    inabauwaUsed: state.inabauwaUsed,
    roundWinner: state.roundWinner,
    consecutivePasses: state.consecutivePasses,
    lastEvent: state.lastEvent,
    config: state.config,
    myPeerId: forPeerId,
  }
}
