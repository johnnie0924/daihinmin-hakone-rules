import { useState, useEffect, useMemo } from 'react'
import type { Card, ClientGameState, SpecialEvent, HandKind } from '../types/game'
import type { RevealInfo } from '../hooks/useGame'
import { analyzeHand, canPlay } from '../hooks/useGameEngine'
import CardView from './CardView'
import Hand from './Hand'
import Field from './Field'
import PlayerInfo from './PlayerInfo'
import ScoreBoard from './ScoreBoard'

type Props = {
  gameState: ClientGameState
  revealInfo: RevealInfo | null
  gameError: string | null
  isHost: boolean
  onPlay: (cards: Card[]) => void
  onPass: () => void
  onInabauwa: (targetPeerId: string) => void
  onNextRound: () => void
  onLeave?: () => void
  onContinue?: () => void
  onDismissReveal: () => void
  onClearError: () => void
  shortcutsEnabled?: boolean
}

const ENABLE_POSITIVE_HINT = true

const HAND_KIND_LABEL: Record<HandKind, string> = {
  single: '単体',
  pair: 'ペア',
  triple: '3枚組',
  stair: '階段',
}

function getEventMessage(event: SpecialEvent, playerName?: string) {
  if (event === 'none') return ''
  const name = playerName ?? '誰か'
  switch (event) {
    case 'switchback':
      return `${name} のスイッチバック！`
    case 'eruption':
      return `${name} の大涌谷 8切り！`
    case 'tenkanoken':
      return `${name} の天下の険（革命）！`
    case 'oldRoad':
      return `${name} の旧街道の一里塚（階段）`
    case 'sekisho':
      return `${name} の箱根関所（縛り）！`
    default:
      return ''
  }
}

export default function GameBoard({
  gameState,
  revealInfo,
  gameError,
  isHost,
  onPlay,
  onPass,
  onInabauwa,
  onNextRound,
  onLeave,
  onContinue,
  onDismissReveal,
  onClearError,
  shortcutsEnabled = true,
}: Props) {
  const [inabauwaMode, setInabauwaMode] = useState(false)
  const [visibleEvent, setVisibleEvent] = useState<SpecialEvent>('none')
  const [selectedCards, setSelectedCards] = useState<Card[]>([])

  useEffect(() => {
    if (!gameState.lastEvent || gameState.lastEvent === 'none') {
      setVisibleEvent('none')
      return
    }
    setVisibleEvent(gameState.lastEvent)
    const t = setTimeout(() => {
      setVisibleEvent('none')
    }, 2000)
    return () => clearTimeout(t)
  }, [gameState.lastEvent])

  const myPlayer = gameState.players.find((p) => p.peerId === gameState.myPeerId)!
  const opponents = gameState.players.filter((p) => p.peerId !== gameState.myPeerId)
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const isMyTurn = currentPlayer?.peerId === gameState.myPeerId
  const parentPlayer = gameState.players[gameState.parentIndex]

  const lastField = gameState.field.length > 0 ? gameState.field[gameState.field.length - 1] : null
  const eventPlayer =
    lastField != null ? gameState.players.find((p) => p.peerId === lastField.playerId) : undefined
  const eventPlayerLabel =
    eventPlayer != null
      ? eventPlayer.peerId === gameState.myPeerId
        ? '自分'
        : eventPlayer.nickname
      : undefined
  const eventMessage = getEventMessage(visibleEvent, eventPlayerLabel)

  const playValidation = useMemo(() => {
    if (!isMyTurn || selectedCards.length === 0) {
      return {
        canPlay: false,
        kindLabel: undefined as string | undefined,
        message: '',
        type: 'none' as const,
      }
    }
    const effectiveRev = gameState.revolution !== gameState.elevenBack
    const analysis = analyzeHand(selectedCards, effectiveRev)
    if (!analysis || !analysis.valid) {
      return {
        canPlay: false,
        kindLabel: undefined,
        message: 'この組み合わせでは出せません',
        type: 'negative' as const,
      }
    }
    const fieldTop =
      gameState.field.length > 0 ? gameState.field[gameState.field.length - 1] : null
    if (!canPlay(analysis, fieldTop, gameState.suitLock)) {
      return {
        canPlay: false,
        kindLabel: undefined,
        message: 'この場には出せません',
        type: 'negative' as const,
      }
    }
    const kindLabel = HAND_KIND_LABEL[analysis.kind] ?? '有効な手'
    if (!ENABLE_POSITIVE_HINT) {
      return {
        canPlay: true,
        kindLabel,
        message: '',
        type: 'none' as const,
      }
    }
    return {
      canPlay: true,
      kindLabel,
      message: `${selectedCards.length}枚・${kindLabel}として出せます`,
      type: 'positive' as const,
    }
  }, [
    isMyTurn,
    selectedCards,
    gameState.field,
    gameState.revolution,
    gameState.elevenBack,
    gameState.suitLock,
  ])

  const inabauwaAvailable =
    !gameState.inabauwaUsed.includes(gameState.myPeerId) &&
    opponents.length > 0

  const playerNickname = (peerId: string) => {
    const p = gameState.players.find((pl) => pl.peerId === peerId)
    return p ? (p.peerId === gameState.myPeerId ? '自分' : p.nickname) : '不明'
  }

  const handleInabauwaClick = () => {
    setInabauwaMode(true)
  }

  const handleSelectTarget = (targetPeerId: string) => {
    onInabauwa(targetPeerId)
    setInabauwaMode(false)
  }

  if (gameState.phase === 'roundEnd' || gameState.phase === 'gameEnd') {
    return (
      <div className="gameboard">
        <ScoreBoard
          gameState={gameState}
          onNextRound={onNextRound}
          onLeave={onLeave}
          onContinue={onContinue}
          isHost={isHost}
        />
      </div>
    )
  }

  return (
    <div className="gameboard">
      <div
        className="event-live-region"
        aria-live="polite"
      >
        {eventMessage}
      </div>

      {/* 特殊イベント演出オーバーレイ */}
      <div className={`event-overlay ${visibleEvent !== 'none' ? 'event-overlay-visible' : ''}`}>
        {visibleEvent === 'switchback' && (
          <div className="event-layer event-switchback">
            <div className="event-switchback-train" />
            <div className="event-text">
              {eventMessage || 'スイッチバック！'}
            </div>
          </div>
        )}
        {visibleEvent === 'eruption' && (
          <div className="event-layer event-eruption">
            <div className="event-text">
              {eventMessage || '大涌谷の噴火！'}
            </div>
          </div>
        )}
        {visibleEvent === 'tenkanoken' && (
          <div className="event-layer event-tenkanoken">
            <div className="event-text">
              {eventMessage || '天下の険（革命）！'}
            </div>
          </div>
        )}
        {visibleEvent === 'oldRoad' && (
          <div className="event-layer event-old-road">
            <div className="event-old-road-path" />
            <div className="event-text">
              {eventMessage || '旧街道の一里塚（階段）'}
            </div>
          </div>
        )}
        {visibleEvent === 'sekisho' && (
          <div className="event-layer event-sekisho">
            <div className="event-sekisho-gate event-sekisho-gate-top" />
            <div className="event-sekisho-gate event-sekisho-gate-bottom" />
            <div className="event-sekisho-bubble">
              {eventMessage || 'これより先、手形なき者は通さぬ！'}
            </div>
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {gameError && (
        <div className="game-error">
          {gameError}
          <button onClick={onClearError} className="game-error-close">✕</button>
        </div>
      )}

      {/* イナバウワー公開モーダル */}
      {revealInfo && (
        <div className="reveal-modal">
          <div
            className="reveal-modal-inner"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inabauwa-title"
          >
            <h3 id="inabauwa-title">イナバウワー！</h3>
            <p>
              {revealInfo.fromNickname} が{' '}
              {revealInfo.targetPeerId === gameState.myPeerId
                ? '自分'
                : gameState.players.find((p) => p.peerId === revealInfo.targetPeerId)?.nickname}
              の手札を公開しました！
            </p>
            <div className="reveal-card">
              <CardView card={revealInfo.card} />
            </div>
            <button
              onClick={onDismissReveal}
              className="btn-close-reveal"
              aria-label="イナバウワー結果を閉じる"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* イナバウワー対象選択 */}
      {inabauwaMode && (
        <div className="reveal-modal">
          <div className="reveal-modal-inner">
            <h3>誰の手札を公開しますか？</h3>
            {opponents.map((op) => (
              <button
                key={op.peerId}
                className="btn-target"
                onClick={() => handleSelectTarget(op.peerId)}
              >
                {op.nickname}
              </button>
            ))}
            <button onClick={() => setInabauwaMode(false)} className="btn-cancel">キャンセル</button>
          </div>
        </div>
      )}

      {/* ラウンド・ゲーム情報 */}
      <div className="game-header">
        <span className="game-round">
          ラウンド {gameState.round} / {gameState.config.roundsPerGame}
        </span>
        {parentPlayer && (
          <span className="game-parent">
            親:{' '}
            {parentPlayer.peerId === gameState.myPeerId ? '自分' : parentPlayer.nickname}
          </span>
        )}
        {gameState.revolution && <span className="badge badge-revolution">革命中</span>}
        {gameState.elevenBack && <span className="badge badge-eleven">11バック</span>}
      </div>

      {/* 相手プレイヤー */}
      <div className="opponents-area">
        {opponents.map((op) => (
          <div key={op.peerId} className="opponent-player">
            <PlayerInfo
              player={op}
              isCurrentPlayer={currentPlayer?.peerId === op.peerId}
              isSelf={false}
              score={gameState.scores[op.peerId] ?? 0}
              onInabauwa={inabauwaAvailable && isMyTurn ? () => handleInabauwaClick() : undefined}
              inabauwaEnabled={inabauwaAvailable && isMyTurn && !inabauwaMode}
            />
            {/* 相手の手札（裏向き） */}
            <div className="opponent-cards">
              {Array.from({ length: op.handCount }).map((_, i) => (
                <CardView key={i} card={{ suit: null, rank: 'joker', id: `back-${op.peerId}-${i}` }} faceDown small />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 場 */}
      <Field
        field={gameState.field}
        suitLock={gameState.suitLock}
        deckCount={gameState.deckCount}
        playerNickname={playerNickname}
      />

      {/* 自分の情報と手札 */}
      <div className="self-area">
        <PlayerInfo
          player={myPlayer}
          isCurrentPlayer={isMyTurn}
          isSelf={true}
          score={gameState.scores[myPlayer.peerId] ?? 0}
          inabauwaEnabled={false}
        />
        <Hand
          hand={myPlayer.hand}
          revolution={gameState.revolution !== gameState.elevenBack}
          isMyTurn={isMyTurn}
          onPlay={onPlay}
          onPass={onPass}
          onInabauwa={inabauwaAvailable ? handleInabauwaClick : undefined}
          inabauwaAvailable={inabauwaAvailable && isMyTurn}
          deckCount={gameState.deckCount}
          canPlaySelected={playValidation.canPlay}
          selectedSummary={
            playValidation.canPlay && playValidation.kindLabel
              ? { kind: playValidation.kindLabel, count: selectedCards.length }
              : undefined
          }
          validationMessage={playValidation.message}
          validationType={playValidation.type}
          shortcutsEnabled={shortcutsEnabled}
          onSelectionChange={setSelectedCards}
        />
      </div>
    </div>
  )
}
