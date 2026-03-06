import { useState, useEffect } from 'react'
import { usePeerChat, type PeerRole } from './hooks/usePeerChat'
import { useGame } from './hooks/useGame'
import ConnectionSetup from './components/ConnectionSetup'
import ChatTab from './components/ChatTab'
import GameTab from './components/GameTab'
import GameConfigPanel from './components/GameConfigPanel'
import { useUnreadChatCount } from './hooks/useUnreadChatCount'
import { useAutoCollapsePeerSection } from './hooks/useAutoCollapsePeerSection'
import { useResetGameOnDisconnect } from './hooks/useResetGameOnDisconnect'
import { DEFAULT_GAME_CONFIG } from './hooks/useGameEngine'
import { pickRandomNickname } from './data/defaultNicknames'
import type { NpcConfig } from './types/game'
import './App.css'

function App() {
  const [nickname, setNickname] = useState(() => pickRandomNickname())
  const [role, setRole] = useState<PeerRole>('host')
  const [isPeerSectionCollapsed, setIsPeerSectionCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'game'>('chat')
  const [roundsPerGame, setRoundsPerGame] = useState(DEFAULT_GAME_CONFIG.roundsPerGame)
  const [enableSwitchback, setEnableSwitchback] = useState(DEFAULT_GAME_CONFIG.enableSwitchback)
  const [enableEruption, setEnableEruption] = useState(DEFAULT_GAME_CONFIG.enableEruption)
  const [enableTenkanoken, setEnableTenkanoken] = useState(DEFAULT_GAME_CONFIG.enableTenkanoken)
  const [enableOldRoad, setEnableOldRoad] = useState(DEFAULT_GAME_CONFIG.enableOldRoad)
  const [enableSekisho, setEnableSekisho] = useState(DEFAULT_GAME_CONFIG.enableSekisho)
  const [fillWithNpc, setFillWithNpc] = useState(false)
  const [npcConfigs, setNpcConfigs] = useState<NpcConfig[]>([
    { id: 'npc-1', nickname: '箱根トラベラー', strategy: 'balanced', enabled: true },
    { id: 'npc-2', nickname: '山の番人', strategy: 'aggressive', enabled: false },
  ])

  const gameConfig = {
    roundsPerGame,
    enableSwitchback,
    enableEruption,
    enableTenkanoken,
    enableOldRoad,
    enableSekisho,
  }

  const {
    myId,
    hostIdInput,
    setHostIdInput,
    messages,
    connectionStatus,
    connectionCount,
    isFullyConnected,
    error,
    connectedPeers,
    connect,
    sendMessage,
    sendGameData,
    setGameDataHandler,
    disconnect,
  } = usePeerChat(nickname.trim(), role)

  const game = useGame({
    role,
    myPeerId: myId ?? '',
    myNickname: nickname.trim(),
    connectedPeers,
    sendGameData,
    initialConfig: gameConfig,
    npcConfigs: fillWithNpc
      ? npcConfigs
      : npcConfigs.map((c) => ({ ...c, enabled: false })),
  })

  const nicknameValid = nickname.trim().length > 0

  const enabledNpcCount = fillWithNpc
    ? npcConfigs.filter((c) => c.enabled).length
    : 0
  const plannedPlayerCount = 1 + connectionCount + enabledNpcCount
  const canStartGameAsHost = role === 'host' && plannedPlayerCount >= 3

  // ゲームデータハンドラを登録
  useEffect(() => {
    setGameDataHandler(game.handleGameData)
  }, [setGameDataHandler, game.handleGameData])

  // UI 都合の副作用をカスタムフックに委譲
  const { unreadChatCount, resetUnreadChatCount } = useUnreadChatCount(messages, activeTab)
  useAutoCollapsePeerSection(isFullyConnected, isPeerSectionCollapsed, setIsPeerSectionCollapsed)
  useResetGameOnDisconnect(connectionCount, role, game.gameState, game.resetGame)

  const handleLeaveGame = () => {
    const msg =
      role === 'host'
        ? '対戦ありがとうございました。ルームを閉じます。'
        : '対戦ありがとうございました。退室します。'
    sendMessage(msg)
    game.resetGame()
    disconnect()
  }

  const canUseChat = (role === 'host' ? connectionCount >= 1 : isFullyConnected) && nicknameValid

  const handleStartGame = () => {
    if (role !== 'host') return
    game.startGame()
    const onOff = (v: boolean) => (v ? 'ON' : 'OFF')
    const msg =
      `箱根ルールでゲームを開始します。` +
      `ラウンド数: ${roundsPerGame} / 特殊ルール: ` +
      `スイッチバック=${onOff(enableSwitchback)}, ` +
      `大涌谷の噴火=${onOff(enableEruption)}, ` +
      `天下の険=${onOff(enableTenkanoken)}, ` +
      `旧街道の一里塚=${onOff(enableOldRoad)}, ` +
      `箱根関所=${onOff(enableSekisho)}`
    sendMessage(msg)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>大貧民 箱根ルール</h1>
        <p className="subtitle">3人で遊べるオンライン大貧民（箱根ルール）</p>
        <a
          href="/rules.html"
          target="_blank"
          rel="noreferrer"
          className="rules-link"
        >
          箱根ルールの説明を見る
        </a>
      </header>

      <ConnectionSetup
        nickname={nickname}
        onChangeNickname={setNickname}
        nicknameValid={nicknameValid}
        role={role}
        onChangeRole={setRole}
        myId={myId}
        hostIdInput={hostIdInput}
        onChangeHostIdInput={setHostIdInput}
        connectionStatus={connectionStatus}
        connectionCount={connectionCount}
        isFullyConnected={isFullyConnected}
        error={error}
        onConnect={connect}
        onDisconnect={disconnect}
        isPeerSectionCollapsed={isPeerSectionCollapsed}
        onTogglePeerSectionCollapsed={() => setIsPeerSectionCollapsed((v) => !v)}
        sendMessage={sendMessage}
      />

      {role === 'host' && (
        <GameConfigPanel
          roundsPerGame={roundsPerGame}
          onChangeRoundsPerGame={setRoundsPerGame}
          enableSwitchback={enableSwitchback}
          onChangeEnableSwitchback={setEnableSwitchback}
          enableEruption={enableEruption}
          onChangeEnableEruption={setEnableEruption}
          enableTenkanoken={enableTenkanoken}
          onChangeEnableTenkanoken={setEnableTenkanoken}
          enableOldRoad={enableOldRoad}
          onChangeEnableOldRoad={setEnableOldRoad}
          enableSekisho={enableSekisho}
          onChangeEnableSekisho={setEnableSekisho}
          npcConfigs={npcConfigs}
          onChangeNpcConfigs={setNpcConfigs}
          fillWithNpc={fillWithNpc}
          onChangeFillWithNpc={setFillWithNpc}
          disabled={game.gameState != null}
        />
      )}

      {/* タブ切り替え */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'chat' ? 'tab-active' : ''}`}
          onClick={() => {
            setActiveTab('chat')
            resetUnreadChatCount()
          }}
        >
          チャット
          {unreadChatCount > 0 && (
            <span className="tab-badge" aria-label={`未読${unreadChatCount}件`}>
              {unreadChatCount > 99 ? '99+' : unreadChatCount}
            </span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'game' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('game')}
        >
          ゲーム
        </button>
      </div>

      {/* チャットタブ */}
      {activeTab === 'chat' && (
        <ChatTab
          messages={messages}
          nickname={nickname}
          role={role}
          canUseChat={canUseChat}
          onSendMessage={sendMessage}
        />
      )}

      {/* ゲームタブ */}
      {activeTab === 'game' && (
        <GameTab
          role={role}
          connectionCount={connectionCount}
          plannedPlayerCount={plannedPlayerCount}
          canStartGame={canStartGameAsHost}
          gameState={game.gameState}
          revealInfo={game.revealInfo}
          gameError={game.gameError}
          onPlay={game.playCards}
          onPass={game.pass}
          onInabauwa={game.useInabauwa}
          onNextRound={game.nextRound}
          onLeaveGame={handleLeaveGame}
          onContinueGame={game.continueGame}
          onDismissReveal={game.dismissReveal}
          onClearGameError={game.clearGameError}
          onStartGame={handleStartGame}
          isActive={activeTab === 'game'}
        />
      )}

      {import.meta.env.DEV && (
        <div className="debug-panel">
          <div>role: {role}</div>
          <div>activeTab: {activeTab}</div>
          <div>messages.length: {messages.length}</div>
          <div>unreadChatCount: {unreadChatCount}</div>
          <div>connectionCount: {connectionCount}</div>
        </div>
      )}
    </div>
  )
}

export default App
