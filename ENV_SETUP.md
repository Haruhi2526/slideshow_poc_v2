# 環境変数設定ガイド

このプロジェクトでは、セキュリティを保つために環境変数をテンプレートファイルとして管理しています。

## ファイル構成

- `api/.env.template` - APIサーバー用の環境変数テンプレート
- `web/.env.template` - Webアプリケーション用の環境変数テンプレート
- `.gitignore` - 実際の環境変数ファイルをGitから除外

## セットアップ手順

### 1. APIサーバーの環境変数設定

```bash
# APIディレクトリに移動
cd api

# テンプレートをコピーして実際の環境変数ファイルを作成
cp .env.template .env

# .envファイルを編集して実際の値を設定
nano .env  # またはお好みのエディタを使用
```

### 2. Webアプリケーションの環境変数設定

```bash
# Webディレクトリに移動
cd web

# テンプレートをコピーして実際の環境変数ファイルを作成
cp .env.template .env.local

# .env.localファイルを編集して実際の値を設定
nano .env.local  # またはお好みのエディタを使用
```

## 必須設定項目

### APIサーバー (.env)

- `JWT_SECRET`: JWT認証用の秘密鍵（本番環境では強力なランダム文字列を使用）
- `LINE_CHANNEL_ID`: LINE Login APIのチャンネルID
- `LINE_CHANNEL_SECRET`: LINE Login APIのチャンネルシークレット
- `DB_PASSWORD`: データベースのパスワード

### Webアプリケーション (.env.local)

- `NEXT_PUBLIC_API_URL`: APIサーバーのURL（通常は `http://localhost:3001`）

## オプション設定項目

### ストレージ設定

ローカルストレージを使用する場合（デフォルト）:
```env
STORAGE_TYPE=local
```

S3ストレージを使用する場合:
```env
STORAGE_TYPE=s3
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_ENDPOINT=https://s3.amazonaws.com
```

## セキュリティ注意事項

⚠️ **重要**: 以下のファイルは絶対にGitにコミットしないでください：
- `api/.env`
- `web/.env.local`
- その他の `.env*` ファイル

これらのファイルには機密情報が含まれているため、`.gitignore`で除外されています。

## トラブルシューティング

### 環境変数が読み込まれない場合

1. ファイル名が正しいか確認（`api/.env`, `web/.env.local`）
2. ファイルの場所が正しいか確認
3. ファイルの権限を確認
4. アプリケーションを再起動

### Dockerを使用している場合

Docker Composeを使用している場合、環境変数は `docker-compose.yml` の `environment` セクションまたは `.env` ファイルで設定できます。

## 本番環境での設定

本番環境では以下の点に注意してください：

1. **強力なパスワード**: `JWT_SECRET` は32文字以上のランダム文字列を使用
2. **HTTPS**: 本番環境では必ずHTTPSを使用
3. **データベース**: 本番用のデータベースパスワードを使用
4. **LINE API**: 本番用のLINE Login API設定を使用
5. **S3設定**: 本番用のS3バケットとアクセスキーを使用

## サポート

環境変数の設定で問題が発生した場合は、プロジェクトのREADMEファイルまたは開発チームにお問い合わせください。
