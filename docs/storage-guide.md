# ストレージ設定ガイド

このプロジェクトは、ローカルストレージとAmazon S3の両方に対応した画像保存システムを提供します。

## 現在の設定（ローカルストレージ）

デフォルトでは、画像はローカルファイルシステムに保存されます。

### 環境変数設定

```bash
# ストレージタイプ
STORAGE_TYPE=local

# ローカルストレージ設定
LOCAL_UPLOAD_PATH=uploads/images
LOCAL_PUBLIC_PATH=/uploads/images
```

### ディレクトリ構造

```
uploads/
└── images/
    └── {album_id}/
        ├── image-{timestamp}-{random}.jpg
        └── thumb_image-{timestamp}-{random}.jpg
```

## S3移行手順

### 1. AWS S3バケットの作成

1. AWS Management ConsoleでS3バケットを作成
2. パブリックアクセスを適切に設定
3. CORS設定を追加（必要に応じて）

### 2. IAMユーザーの作成

1. S3へのアクセス権限を持つIAMユーザーを作成
2. 以下のポリシーを付与：
   - `s3:PutObject`
   - `s3:GetObject`
   - `s3:DeleteObject`
   - `s3:PutObjectAcl`

### 3. 環境変数の更新

```bash
# ストレージタイプをS3に変更
STORAGE_TYPE=s3

# S3設定
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_ENDPOINT=https://s3.amazonaws.com
```

### 4. 依存関係のインストール

```bash
npm install @aws-sdk/client-s3
```

### 5. 既存データの移行（オプション）

既存のローカル画像をS3に移行する場合は、移行スクリプトを作成することをお勧めします。

## 機能

### 画像アップロード
- 複数画像の同時アップロード
- 自動リサイズ（最大1920x1080）
- サムネイル生成（300x300）
- 画像形式の最適化（JPEG品質85%）

### アルバム管理
- アルバム単位での画像整理
- ドラッグ&ドロップによる順序変更
- 画像の回転機能
- サムネイル表示

### ストレージ抽象化
- ローカルストレージとS3の統一インターフェース
- 設定変更のみでストレージ切り替え可能
- 将来的な他のストレージサービスへの対応も容易

## トラブルシューティング

### ローカルストレージ
- `uploads`ディレクトリの書き込み権限を確認
- ディスク容量を確認

### S3ストレージ
- AWS認証情報の確認
- バケットの存在とアクセス権限の確認
- ネットワーク接続の確認

## セキュリティ考慮事項

### ローカルストレージ
- ファイルアップロードの検証
- ディレクトリトラバーサル攻撃の防止
- 適切なファイル権限の設定

### S3ストレージ
- IAMロールの最小権限の原則
- バケットポリシーの適切な設定
- アクセスログの監視
