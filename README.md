# 大貧民 箱根ルール（Daihinmin Hakone Rules）

P2P 通信を前提とした Web アプリ。まずはチャット機能を実装しています。

## 技術スタック

- **フロント**: React 18 + TypeScript + Vite
- **P2P**: [PeerJS](https://peerjs.com/)（WebRTC のシグナリングに PeerJS クラウドを使用、バックエンド不要）

## セットアップ

```bash
cd daihinmin-hakone-rules
npm install
```

## 起動

```bash
npm run dev
```

ブラウザで表示された URL（例: http://localhost:5173）を開きます。

## チャットの使い方

1. 起動すると「自分の Peer ID」が表示されます。相手に伝えるか、コピーしておきます。
2. もう一つのブラウザ（またはシークレットウィンドウ）で同じ URL を開き、そちらの「自分の Peer ID」を控えます。
3. 片方の画面で「相手の Peer ID で接続」に相手の ID を入力し「接続」を押します。
4. 接続後、メッセージの送受信ができます。データは PeerJS のシグナリングサーバー経由で接続確立後は **P2P（WebRTC）で直接** やり取りされます。

## ビルド

```bash
npm run build
```

生成された `dist` を任意の静的ホスティングにデプロイできます。
