import { useState } from 'react'
import type { NpcConfig } from '../types/game'

type Props = {
  roundsPerGame: number
  onChangeRoundsPerGame: (value: number) => void
  enableSwitchback: boolean
  onChangeEnableSwitchback: (value: boolean) => void
  enableEruption: boolean
  onChangeEnableEruption: (value: boolean) => void
  enableTenkanoken: boolean
  onChangeEnableTenkanoken: (value: boolean) => void
  enableOldRoad: boolean
  onChangeEnableOldRoad: (value: boolean) => void
  enableSekisho: boolean
  onChangeEnableSekisho: (value: boolean) => void
  npcConfigs: NpcConfig[]
  onChangeNpcConfigs: (next: NpcConfig[]) => void
  fillWithNpc: boolean
  onChangeFillWithNpc: (value: boolean) => void
  disabled: boolean
}

function GameConfigPanel({
  roundsPerGame,
  onChangeRoundsPerGame,
  enableSwitchback,
  onChangeEnableSwitchback,
  enableEruption,
  onChangeEnableEruption,
  enableTenkanoken,
  onChangeEnableTenkanoken,
  enableOldRoad,
  onChangeEnableOldRoad,
  enableSekisho,
  onChangeEnableSekisho,
  npcConfigs,
  onChangeNpcConfigs,
  fillWithNpc,
  onChangeFillWithNpc,
  disabled,
}: Props) {
  const handleNpcChange = (index: number, patch: Partial<NpcConfig>) => {
    const next = npcConfigs.map((cfg, i) => (i === index ? { ...cfg, ...patch } : cfg))
    onChangeNpcConfigs(next)
  }

  const [isNpcPanelOpen, setIsNpcPanelOpen] = useState(false)

  return (
    <section className="game-config-section">
      <h2 className="game-config-title">ゲーム設定（ホストのみ）</h2>
      <div className="game-config-row">
        <label htmlFor="roundsPerGame">ラウンド数</label>
        <input
          id="roundsPerGame"
          type="number"
          min={1}
          max={10}
          value={roundsPerGame}
          onChange={(e) => onChangeRoundsPerGame(Number(e.target.value) || 1)}
          disabled={disabled}
        />
      </div>
      <div className="game-config-rules">
        <label className="game-config-checkbox">
          <input
            type="checkbox"
            checked={enableSwitchback}
            onChange={(e) => onChangeEnableSwitchback(e.target.checked)}
            disabled={disabled}
          />
          スイッチバック（11バック）
        </label>
        <label className="game-config-checkbox">
          <input
            type="checkbox"
            checked={enableEruption}
            onChange={(e) => onChangeEnableEruption(e.target.checked)}
            disabled={disabled}
          />
          大涌谷の噴火（8切り）
        </label>
        <label className="game-config-checkbox">
          <input
            type="checkbox"
            checked={enableTenkanoken}
            onChange={(e) => onChangeEnableTenkanoken(e.target.checked)}
            disabled={disabled}
          />
          天下の険（革命）
        </label>
        <label className="game-config-checkbox">
          <input
            type="checkbox"
            checked={enableOldRoad}
            onChange={(e) => onChangeEnableOldRoad(e.target.checked)}
            disabled={disabled}
          />
          旧街道の一里塚（階段）
        </label>
        <label className="game-config-checkbox">
          <input
            type="checkbox"
            checked={enableSekisho}
            onChange={(e) => onChangeEnableSekisho(e.target.checked)}
            disabled={disabled}
          />
          箱根関所（縛り）
        </label>
      </div>

      <div className="game-config-npc">
        <button
          type="button"
          className="npc-config-toggle"
          onClick={() => setIsNpcPanelOpen((v) => !v)}
          disabled={disabled}
        >
          NPC設定 {isNpcPanelOpen ? '▲' : '▼'}
        </button>

        {isNpcPanelOpen && (
          <div className="npc-config-body">
            <label className="game-config-checkbox">
              <input
                type="checkbox"
                checked={fillWithNpc}
                onChange={(e) => onChangeFillWithNpc(e.target.checked)}
                disabled={disabled}
              />
              不足人数をNPCで自動補完する
            </label>

            {npcConfigs.map((cfg, index) => (
              <div key={cfg.id} className="game-config-npc-slot">
                <div className="game-config-npc-row">
                  <span className="game-config-npc-label">NPCスロット{index + 1}</span>
                  <label className="game-config-checkbox">
                    <input
                      type="checkbox"
                      checked={cfg.enabled}
                      onChange={(e) => handleNpcChange(index, { enabled: e.target.checked })}
                      disabled={disabled || !fillWithNpc}
                    />
                    有効
                  </label>
                </div>
                <div className="game-config-npc-row">
                  <label>
                    戦略
                    <select
                      value={cfg.strategy}
                      onChange={(e) =>
                        handleNpcChange(index, {
                          strategy: e.target.value as NpcConfig['strategy'],
                        })
                      }
                      disabled={disabled || !fillWithNpc}
                    >
                      <option value="balanced">バランス</option>
                      <option value="aggressive">攻め</option>
                      <option value="random">ランダム</option>
                    </select>
                  </label>
                  <label>
                    ニックネーム
                    <input
                      type="text"
                      value={cfg.nickname}
                      onChange={(e) => handleNpcChange(index, { nickname: e.target.value })}
                      disabled={disabled || !fillWithNpc}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default GameConfigPanel

