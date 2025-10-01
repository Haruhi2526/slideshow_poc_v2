# S3移行スクリプト

既存のローカル画像をAmazon S3に移行するためのスクリプトです。

## 使用方法

```bash
# 依存関係をインストール
npm install @aws-sdk/client-s3

# 環境変数を設定
export STORAGE_TYPE=s3
export S3_BUCKET=your-bucket-name
export S3_REGION=us-east-1
export S3_ACCESS_KEY_ID=your-access-key-id
export S3_SECRET_ACCESS_KEY=your-secret-access-key

# 移行スクリプトを実行
node scripts/migrate-to-s3.js
```

## 注意事項

- 移行前にデータベースのバックアップを取ってください
- 移行中はアプリケーションを停止してください
- 移行完了後、ローカルファイルの削除は手動で行ってください
- 移行前にS3バケットの設定を確認してください

## スクリプトの機能

1. データベースから画像情報を取得
2. ローカルファイルをS3にアップロード
3. データベースのURLを更新
4. 移行結果のレポートを生成
