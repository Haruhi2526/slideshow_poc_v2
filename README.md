# slideshow_poc_v2
Web、APIを持ち、アルバム写真からスライドショー動画を作成するアプリケーションを作ります。



## レポジトリ構成

```
slideshow_poc_v2/
├── api/                    # APIサーバー（Node.js/Express）
│   ├── src/
│   │   ├── controllers/    # コントローラー
│   │   ├── middleware/     # ミドルウェア
│   │   ├── models/         # データモデル
│   │   ├── routes/         # ルート定義
│   │   ├── services/       # ビジネスロジック
│   │   ├── types/          # 型定義
│   │   └── utils/          # ユーティリティ
│   ├── uploads/            # アップロードファイル
│   ├── .env.template       # 環境変数テンプレート
│   └── package.json
├── web/                    # Webアプリケーション（Next.js 14）
│   ├── src/
│   │   ├── app/            # App Router
│   │   ├── components/     # Reactコンポーネント
│   │   ├── hooks/          # カスタムフック
│   │   ├── lib/            # ライブラリ
│   │   └── types/          # 型定義
│   ├── .env.template       # 環境変数テンプレート
│   └── package.json
├── docs/                   # ドキュメント
│   ├── requirements/       # 要件定義
│   ├── screens/            # 画面設計図
│   ├── line-login-guide.md # LINE Login設定ガイド
│   └── storage-guide.md    # ストレージ設定ガイド
├── test/                   # 単体テスト
├── uploads/                # アップロードファイル（開発用）
├── scripts/                # スクリプト
├── docker-compose.yml      # Docker Compose設定
├── Makefile               # 開発用コマンド
├── ENV_SETUP.md           # 環境変数設定ガイド
└── README.md              # このファイル
```

## 技術スタック

以下の技術要件を満たしてください。
- フロントエンド: Next.js 14 (App Router)
- バックエンド: Node.js/Express
- データベース: MySQL



## 環境変数設定

このプロジェクトでは、セキュリティを保つために環境変数をテンプレートファイルとして管理しています。

### セットアップ手順

1. **APIサーバーの環境変数設定**
   ```bash
   cd api
   cp .env.template .env
   # .envファイルを編集して実際の値を設定
   ```

2. **Webアプリケーションの環境変数設定**
   ```bash
   cd web
   cp .env.template .env.local
   # .env.localファイルを編集して実際の値を設定
   ```

### 必須設定項目

- **API**: `JWT_SECRET`, `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `DB_PASSWORD`
- **Web**: `NEXT_PUBLIC_API_URL`

詳細な設定方法は [ENV_SETUP.md](./ENV_SETUP.md) を参照してください。

## 前提条件

- API ドキュメントは api ディレクトリ内で都度更新をする。
- E2Eテストは web ディレクトリ内で作成する。
- docs ディレクトリに画面設計図を格納するディレクトリと要件を整理するディレクトリを分けて管理する。
- 単体テストは test ディレクトリに格納する。



## 要件定義
- LINEアカウントでログイン・新規登録できるようにする。
- 一度ログインしたら一定期間はログイン状態を保持するようにする。
- ユーザーは画像を選択し、サーバーに保存することができる。
- ユーザーは保存した画像をアルバムとして閲覧できる。
- ユーザーはアルバム内の画像をスライドショー動画に変換し、サーバーに保存することができる。



## 運用情報

### 起動方法

- **コンテナ起動**
  ```bash
  make up
  ```

- **コンテナ終了**
  ```bash
  make down
  ```

### アクセスURL

- **フロントエンド**: http://localhost:3000
- **API**: http://localhost:3001
- **データベース**: localhost:3306

### 開発環境

ローカル環境はDockerでMySQL、Web、APIの3つのコンテナを立ち上げる構成です。

### その他のコマンド

詳細なMakefileコマンドは `make help` で確認できます。