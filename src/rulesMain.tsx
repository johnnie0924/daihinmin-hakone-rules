import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'

function RulesApp() {
  const [switchbackKey, setSwitchbackKey] = useState(0)
  const [eruptionKey, setEruptionKey] = useState(0)
  const [tenkanokenKey, setTenkanokenKey] = useState(0)
  const [oldRoadKey, setOldRoadKey] = useState(0)
  const [sekishoKey, setSekishoKey] = useState(0)
  const [inabauwaKey, setInabauwaKey] = useState(0)

  return (
    <div className="rules-page">
      <header className="rules-header">
        <h1>箱根ルール 特殊ルール解説</h1>
        <p className="rules-subtitle">
          大貧民に箱根ゆかりの演出を加えた、5つの特殊ルールの説明ページです。
        </p>
        <p className="rules-subtitle">
          とある大学生が箱根旅行の際に考案した超ローカルルールをベースにした、オリジナルの大貧民ルールです。
        </p>
      </header>

      <main className="rules-main">
        <section className="rules-section">
          <h2>スイッチバック（11バック）</h2>
          <p className="rules-label">元の名称: 11バック</p>
          <p>
            11 を含むカードを出すと「11バック」が発生し、以降しばらくの間カードの強さの向きが反転します。
            高いカードほど弱く、低いカードほど強くなる状態です。
          </p>
          <p>
            箱根登山鉄道のスイッチバックにちなんで、登山電車が坂道を切り返しながら登っていく演出が表示されます。
          </p>
          <div className="rules-preview-box">
            <button
              type="button"
              className="rules-preview-button"
              onClick={() => setSwitchbackKey((k) => k + 1)}
            >
              演出を再生
            </button>
            <div key={switchbackKey} className="rules-preview-sandbox event-switchback">
              <div className="event-switchback-train" />
              <div className="rules-preview-label">スイッチバック演出プレビュー</div>
            </div>
          </div>
        </section>

        <section className="rules-section">
          <h2>大涌谷の噴火（8切り）</h2>
          <p className="rules-label">元の名称: 8切り</p>
          <p>
            8 を含むカードを出すと、その場に出ているカードの束がすべて流れ、出したプレイヤーが続けて親としてカードを出せるようになります。
          </p>
          <p>
            大涌谷の噴火をイメージして、画面全体に煙が立ちのぼるような演出が短時間表示されます。
          </p>
          <div className="rules-preview-box">
            <button
              type="button"
              className="rules-preview-button"
              onClick={() => setEruptionKey((k) => k + 1)}
            >
              演出を再生
            </button>
            <div key={eruptionKey} className="rules-preview-sandbox event-eruption">
              <div className="rules-preview-label">大涌谷の噴火演出プレビュー</div>
            </div>
          </div>
        </section>

        <section className="rules-section">
          <h2>天下の険（革命）</h2>
          <p className="rules-label">元の名称: 革命</p>
          <p>
            同じランクのカードを4枚以上まとめて出すと「革命」が起こり、カードの強さが上下ひっくり返ります。
            3 が最強、2 が最弱になる特別な状態です。
          </p>
          <p>
            箱根の険しい山道「天下の険」にちなんで、画面全体が揺れ、世界が反転したような演出が表示されます。
          </p>
          <div className="rules-preview-box">
            <button
              type="button"
              className="rules-preview-button"
              onClick={() => setTenkanokenKey((k) => k + 1)}
            >
              演出を再生
            </button>
            <div key={tenkanokenKey} className="rules-preview-sandbox event-tenkanoken">
              <div className="rules-preview-label">天下の険演出プレビュー</div>
            </div>
          </div>
        </section>

        <section className="rules-section">
          <h2>旧街道の一里塚（階段）</h2>
          <p className="rules-label">元の名称: 階段</p>
          <p>
            同じスートで数字が1つずつつながったカードを並べて出すと「階段」として扱われます。
            通常のペアや単体とは別の強さ比較で場に出すことができます。
          </p>
          <p>
            箱根旧街道に並ぶ一里塚のイメージで、石畳の道が横に流れていく演出が表示されます。
          </p>
          <div className="rules-preview-box">
            <button
              type="button"
              className="rules-preview-button"
              onClick={() => setOldRoadKey((k) => k + 1)}
            >
              演出を再生
            </button>
            <div key={oldRoadKey} className="rules-preview-sandbox event-old-road">
              <div className="event-old-road-path" />
              <div className="rules-preview-label">旧街道の一里塚演出プレビュー</div>
            </div>
          </div>
        </section>

        <section className="rules-section">
          <h2>箱根関所（縛り）</h2>
          <p className="rules-label">元の名称: 縛り</p>
          <p>
            あるスートだけが続けて出されると、そのスート以外のカードでは場に出せなくなる「縛り」状態に入ります。
            条件を満たすカードを持っていないと、パスせざるを得ない厳しい状況になります。
          </p>
          <p>
            箱根関所にならい、上下から門が閉まり、「これより先、手形なき者は通さぬ！」という吹き出しが現れる演出が表示されます。
          </p>
          <div className="rules-preview-box">
            <button
              type="button"
              className="rules-preview-button"
              onClick={() => setSekishoKey((k) => k + 1)}
            >
              演出を再生
            </button>
            <div key={sekishoKey} className="rules-preview-sandbox event-sekisho">
              <div className="event-sekisho-gate event-sekisho-gate-top" />
              <div className="event-sekisho-gate event-sekisho-gate-bottom" />
              <div className="event-sekisho-bubble">
                これより先、手形なき者は通さぬ！
              </div>
              <div className="rules-preview-label rules-preview-label-dark">箱根関所演出プレビュー</div>
            </div>
          </div>
        </section>

        <section className="rules-section">
          <h2>イナバウワー</h2>
          <p className="rules-label">特別技: イナバウワー</p>
          <p>
            1ゲーム中に各プレイヤーが1度だけ使えるフィギュアスケート技モチーフのスペシャルアクションです。
            指名したプレイヤーの手札からランダムに1枚を曲げて公開し、全員に見えるようにします。
          </p>
          <p>
            手札がバレる緊張感と、逆転のきっかけにもなり得る読み合いを生み出す、箱根ルールならではの見せ場です。
          </p>
          <div className="rules-preview-box">
            <button
              type="button"
              className="rules-preview-button"
              onClick={() => setInabauwaKey((k) => k + 1)}
            >
              演出を再生
            </button>
            <div key={inabauwaKey} className="rules-preview-sandbox event-inabauwa">
              <div className="event-inabauwa-hand">
                <div className="event-inabauwa-card-base" />
                <div className="event-inabauwa-card-bend" />
              </div>
              <div className="rules-preview-label">イナバウワー演出プレビュー</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RulesApp />
  </StrictMode>,
)

