import { useEffect, useRef } from 'react'
import type { PeerRole } from '../hooks/usePeerChat'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

type Props = {
  nickname: string
  onChangeNickname: (value: string) => void
  nicknameValid: boolean
  role: PeerRole
  onChangeRole: (role: PeerRole) => void
  myId: string | null
  hostIdInput: string
  onChangeHostIdInput: (value: string) => void
  connectionStatus: ConnectionStatus
  connectionCount: number
  isFullyConnected: boolean
  error: string | null
  onConnect: () => void
  onDisconnect: () => void
  isPeerSectionCollapsed: boolean
  onTogglePeerSectionCollapsed: () => void
  sendMessage: (text: string) => void
}

function ConnectionSetup({
  nickname,
  onChangeNickname,
  nicknameValid,
  role,
  onChangeRole,
  myId,
  hostIdInput,
  onChangeHostIdInput,
  connectionStatus,
  connectionCount,
  isFullyConnected,
  error,
  onConnect,
  onDisconnect,
  isPeerSectionCollapsed,
  onTogglePeerSectionCollapsed,
  sendMessage,
}: Props) {
  const lastCommittedNicknameRef = useRef('')

  useEffect(() => {
    const t = nickname.trim()
    if (t) lastCommittedNicknameRef.current = t
  }, [])

  const handleNicknameBlur = () => {
    const trimmed = nickname.trim()
    if (
      connectionCount >= 1 &&
      trimmed.length > 0 &&
      trimmed !== lastCommittedNicknameRef.current
    ) {
      sendMessage(`「${lastCommittedNicknameRef.current}」から「${trimmed}」にニックネームを変えました`)
    }
    if (trimmed.length > 0) {
      lastCommittedNicknameRef.current = trimmed
    }
  }

  return (
    <>
      <section className="nickname-section">
        <label htmlFor="nickname">ニックネーム</label>
        <input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(e) => onChangeNickname(e.target.value)}
          onBlur={handleNicknameBlur}
          placeholder="チャットで表示する名前（必須）"
          maxLength={32}
        />
      </section>

      <section className="role-section">
        <span className="role-label">役割</span>
        <label className="role-option">
          <input
            type="radio"
            name="role"
            checked={role === 'host'}
            onChange={() => onChangeRole('host')}
            disabled={connectionStatus === 'connected' || connectionCount > 0}
          />
          ホスト（待ち受け・Peer ID を2人に共有）
        </label>
        <label className="role-option">
          <input
            type="radio"
            name="role"
            checked={role === 'client'}
            onChange={() => onChangeRole('client')}
            disabled={connectionStatus === 'connected' || connectionCount > 0}
          />
          クライアント（ホストの Peer ID で接続）
        </label>
      </section>

      <section className={`peer-section ${isPeerSectionCollapsed ? 'collapsed' : ''}`}>
        <button
          type="button"
          className="peer-section-toggle"
          onClick={onTogglePeerSectionCollapsed}
          aria-expanded={!isPeerSectionCollapsed}
        >
          <span>Peer ID・接続</span>
          <span className="toggle-icon" aria-hidden>
            {isPeerSectionCollapsed ? '▼' : '▲'}
          </span>
        </button>
        {!isPeerSectionCollapsed && (
          <div className="peer-section-body">
            <div className="my-id">
              <label>自分の Peer ID</label>
              <div className="id-value">
                {myId ? (
                  <>
                    <code>{myId}</code>
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() => myId && navigator.clipboard.writeText(myId)}
                      disabled={!nicknameValid}
                      title={!nicknameValid ? 'ニックネームを入力してください' : ''}
                    >
                      コピー
                    </button>
                  </>
                ) : (
                  <span className="loading">接続中...</span>
                )}
              </div>
            </div>

            {role === 'host' && (
              <div className="status">
                接続数: <strong>{connectionCount} / {2}</strong>
                {connectionCount >= 2 && '（3人でチャット可能）'}
              </div>
            )}

            {role === 'client' && (
              <div className="connect-form">
                <label>ホストの Peer ID</label>
                <div className="connect-row">
                  <input
                    type="text"
                    value={hostIdInput}
                    onChange={(e) => onChangeHostIdInput(e.target.value)}
                    placeholder="ホストの ID を入力"
                    disabled={isFullyConnected}
                  />
                  {!isFullyConnected ? (
                    <button
                      type="button"
                      onClick={onConnect}
                      disabled={!nicknameValid || !myId || !hostIdInput.trim()}
                    >
                      接続
                    </button>
                  ) : (
                    <button type="button" onClick={onDisconnect} className="disconnect">
                      切断
                    </button>
                  )}
                </div>
              </div>
            )}

            {role === 'client' && (
              <div className="status">
                状態:{' '}
                <strong>
                  {connectionStatus === 'connected'
                    ? '接続済み'
                    : connectionStatus === 'connecting'
                      ? '接続中...'
                      : '未接続'}
                </strong>
              </div>
            )}
            {error && <div className="error">{error}</div>}
          </div>
        )}
      </section>
    </>
  )
}

export default ConnectionSetup

