# 大貧民 箱根ルール（Daihinmin Hakone Rules）

3 人対戦の大貧民（箱根ルール）を **P2P 通信で遊べる Web アプリ** です。  
PeerJS を利用した WebRTC により、専用バックエンドを用意せずにブラウザ間で直接通信します。

主な機能:

- P2P テキストチャット
- 3 人対戦の大貧民ゲーム（箱根ルール）
- 特殊ルール（革命 / 8 切り / 11 バック / 階段 / 縛り）の演出表示
- ルール解説ページ（`rules.html`）

## 技術スタック

- **フロントエンド**: React 18 + TypeScript + Vite
- **P2P 通信**: [PeerJS](https://peerjs.com/)  
  - PeerJS のクラウドシグナリングを利用し、接続確立後は **ブラウザ間で直接 WebRTC 通信** を行います（バックエンドレス構成）。

## セットアップ

```bash
cd daihinmin-hakone-rules
npm install
```

## 開発サーバの起動

```bash
npm run dev
```

ターミナルに表示された URL（例: `http://localhost:5173`）をブラウザで開きます。  
P2P 通信を試す場合は、**別ブラウザやシークレットウィンドウを開き、同じ URL に 2〜3 クライアントでアクセス**してください。

## 使い方

### 接続とチャット

1. 画面上部の「ニックネーム」にチャットで表示したい名前を入力します。
2. 「役割」で **ホスト / クライアント** を選択します。
   - ホスト: 自分の Peer ID を 2 人に共有し、接続を待ちます。
   - クライアント: ホストから教えてもらった Peer ID を入力して接続します。
3. ホスト画面に表示される「自分の Peer ID」をコピーし、他のプレイヤーに共有します。
4. クライアント側で「ホストの Peer ID」にその値を入力し、「接続」を押します。
5. 接続が確立すると、チャット欄でメッセージの送受信ができます（メッセージは PeerJS のシグナリングサーバー経由で接続確立後、WebRTC で直接やり取りされます）。

### ゲームの遊び方

1. 画面中央のタブで「ゲーム」タブを選択します。
2. ホスト:
   - 必要に応じて「ゲーム設定（ホストのみ）」でラウンド数や特殊ルール（スイッチバック / 大涌谷の噴火 / 天下の険 / 旧街道の一里塚 / 箱根関所）を設定します。
   - プレイヤーが 2〜3 人接続したら「ゲーム開始」ボタンを押します。
3. ゲーム中:
   - 自分のターンでは手札をクリックして選択し、「出す」ボタンで場に出します。
   - 出せる手がない／出したくない場合は「パス（1枚引く）」を押します。
   - ラウンド終了時にはスコアボードが表示され、ホストが「次のラウンドへ」を押すと次ラウンドが開始されます。
   - 所定ラウンドが終了するとゲーム終了となり、合計点で勝敗が決まります。

### ルール解説ページ

ゲームの細かな箱根ルールは、専用のルール解説ページで確認できます。

- 開発中: `http://localhost:5173/rules.html`
- 本番環境: デプロイ先の URL に `/rules.html` を付けたパス（例: `https://your-app.vercel.app/rules.html`）

## ビルド

```bash
npm run build
```

`dist/` ディレクトリにビルド済みの静的ファイルが生成されます。  
任意の静的ホスティング（Vercel, Netlify, GitHub Pages など）で配信できます。

## デプロイ（GitHub + Vercel の例）

このリポジトリは、GitHub に push したうえで Vercel からデプロイする運用を想定しています。

1. **GitHub にコードを push**
   - ローカルで作業したあと、通常どおり `git add` / `git commit` / `git push` します。
2. **Vercel でプロジェクトを作成**
   - Vercel にログインし、「New Project」からこのリポジトリを Import します。
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. **自動ビルド & デプロイ**
   - 設定が完了すると、GitHub の `main` ブランチに push されるたびに Vercel が自動でビルド・デプロイします。
   - デプロイ完了後、`https://<project-name>.vercel.app` のような URL が発行されます。

## 開発者向けメモ

アプリの主要なコードは以下にあります:

- エントリポイント: `src/main.tsx`
- ルートコンテナ: `src/App.tsx`
- P2P チャット管理: `src/hooks/usePeerChat.ts`
- ゲーム状態管理: `src/hooks/useGame.ts`
- ゲームロジック（カード判定・スコア計算など）: `src/hooks/useGameEngine.ts`, `src/types/game.ts`
- ゲーム画面 UI: `src/components/GameBoard.tsx` および配下コンポーネント

TypeScript の設定は `tsconfig.json`、Vite の設定は `vite.config.ts` を参照してください。
