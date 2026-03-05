export type Suit = 'spade' | 'heart' | 'diamond' | 'club'
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 'joker'

export type Card = {
  suit: Suit | null
  rank: Rank
  id: string
}

export type HandKind = 'single' | 'pair' | 'triple' | 'stair'

export type SpecialEvent =
  | 'none'
  | 'switchback'   // 11バック
  | 'eruption'     // 8切り
  | 'tenkanoken'   // 革命
  | 'oldRoad'      // 階段
  | 'sekisho'      // 縛り

export type GameConfig = {
  roundsPerGame: number
  enableSwitchback: boolean
  enableEruption: boolean
  enableTenkanoken: boolean
  enableOldRoad: boolean
  enableSekisho: boolean
}

export type FieldEntry = {
  cards: Card[]
  kind: HandKind
  strength: number
  suit: Suit | null
  playerId: string
}

export type FullPlayerState = {
  peerId: string
  nickname: string
  hand: Card[]
  handCount: number
  passedThisTrick: boolean
}

export type ClientPlayerState = {
  peerId: string
  nickname: string
  hand: Card[]
  handCount: number
  passedThisTrick: boolean
}

export type GamePhase = 'waiting' | 'playing' | 'roundEnd' | 'gameEnd'

export type FullGameState = {
  phase: GamePhase
  round: number
  currentPlayerIndex: number
  parentIndex: number
  field: FieldEntry[]
  players: FullPlayerState[]
  deck: Card[]
  revolution: boolean
  elevenBack: boolean
  suitLock: Suit | null
  scores: Record<string, number>
  roundScores: Record<string, number[]>
  inabauwaUsed: string[]
  roundWinner: string | null
  consecutivePasses: number
  lastEvent: SpecialEvent
  config: GameConfig
}

export type ClientGameState = {
  phase: GamePhase
  round: number
  currentPlayerIndex: number
  parentIndex: number
  field: FieldEntry[]
  players: ClientPlayerState[]
  deckCount: number
  revolution: boolean
  elevenBack: boolean
  suitLock: Suit | null
  scores: Record<string, number>
  roundScores: Record<string, number[]>
  inabauwaUsed: string[]
  roundWinner: string | null
  consecutivePasses: number
  myPeerId: string
  lastEvent: SpecialEvent
  config: GameConfig
}

export type GameAction =
  | { kind: 'play'; cards: Card[] }
  | { kind: 'pass' }
  | { kind: 'inabauwa'; targetPeerId: string }
  | { kind: 'nextRound' }
  | { kind: 'continue' }

export type WireGameAction = { type: 'game:action'; action: GameAction }
export type WireGameState = { type: 'game:state'; state: ClientGameState }
export type WireGameReveal = { type: 'game:reveal'; card: Card; fromNickname: string; targetPeerId: string }
export type WireGameError = { type: 'game:error'; message: string }
export type WireGameReset = { type: 'game:reset' }
export type WireGameData = WireGameAction | WireGameState | WireGameReveal | WireGameError | WireGameReset
