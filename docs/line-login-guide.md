# LINE Login テスト用設定ガイド

## 1. LINE Developers Console での設定

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. 新しいプロバイダーを作成（初回の場合）
3. 新しいチャンネルを作成し、LINE Login を選択
4. チャンネル基本設定で以下を設定：
   - チャンネル名: スライドショーアプリ（任意）
   - チャンネル説明: スライドショー作成アプリ（任意）
   - アプリタイプ: Web app
   - コールバックURL: `http://localhost:3000/auth/callback`

## 2. 環境変数の設定

### バックエンド（api/.env）
```env
# LINE Login API
LINE_CHANNEL_ID=your_line_channel_id
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_REDIRECT_URI=http://localhost:3000/auth/callback
LINE_SCOPE=profile%20openid
```

### フロントエンド（web/.env.local）
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 3. テスト用ログイン機能

本アプリには以下の2つのログイン方法があります：

### 1. 実際のLINE Login
- 「LINEでログイン/新規登録」ボタンをクリック
- LINE認証画面にリダイレクト
- LINEアカウントでログイン
- アプリに戻って認証完了

### 2. テスト用ログイン
- 「テスト用ログイン」ボタンをクリック
- プロンプトでテスト用のLINE User IDを入力
- ダミーユーザーとしてログイン

## 4. 起動方法

```bash
# バックエンド起動
cd api
npm run dev

# フロントエンド起動（別ターミナル）
cd web
npm run dev
```

## 5. 注意事項

- LINE Developers Consoleで設定したコールバックURLと環境変数の`LINE_REDIRECT_URI`が一致していることを確認してください
- テスト用ログインは開発環境でのみ使用してください
- 本番環境では実際のLINE Loginのみを使用してください
