# Slideshow API Documentation

## 概要
アルバム写真からスライドショー動画を作成するAPI

## ベースURL
```
http://localhost:3001
```

## 認証
JWTトークンを使用した認証が必要です。リクエストヘッダーに以下の形式でトークンを含めてください：
```
Authorization: Bearer <your_jwt_token>
```

## エンドポイント

### 認証

#### POST /api/auth/login
LINEアカウントでログイン・新規登録

**リクエストボディ:**
```json
{
  "lineUserId": "string",
  "displayName": "string (optional)",
  "pictureUrl": "string (optional)"
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "line_user_id": "U1234567890",
      "display_name": "ユーザー名",
      "picture_url": "https://example.com/picture.jpg"
    },
    "token": "jwt_token_here"
  }
}
```

#### GET /api/auth/me
現在のユーザー情報を取得

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "line_user_id": "U1234567890",
      "display_name": "ユーザー名",
      "picture_url": "https://example.com/picture.jpg"
    }
  }
}
```

### アルバム

#### GET /api/albums
ユーザーのアルバム一覧を取得

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "albums": [
      {
        "id": 1,
        "user_id": 1,
        "name": "アルバム名",
        "description": "説明",
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

#### POST /api/albums
新しいアルバムを作成

**リクエストボディ:**
```json
{
  "name": "アルバム名",
  "description": "説明 (optional)"
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "album": {
      "id": 1,
      "user_id": 1,
      "name": "アルバム名",
      "description": "説明",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### GET /api/albums/:id
アルバム詳細を取得（画像一覧含む）

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "album": {
      "id": 1,
      "user_id": 1,
      "name": "アルバム名",
      "description": "説明",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "images": [
        {
          "id": 1,
          "album_id": 1,
          "filename": "image-1234567890.jpg",
          "original_filename": "photo.jpg",
          "file_path": "uploads/images/image-1234567890.jpg",
          "file_size": 1024000,
          "mime_type": "image/jpeg",
          "width": 1920,
          "height": 1080,
          "created_at": "2024-01-01T00:00:00.000Z"
        }
      ]
    }
  }
}
```

#### PUT /api/albums/:id
アルバムを更新

#### DELETE /api/albums/:id
アルバムを削除

### 画像

#### POST /api/images/upload/:albumId
画像をアップロード

**リクエスト:**
- Content-Type: multipart/form-data
- ファイル: image (画像ファイル)

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "image": {
      "id": 1,
      "album_id": 1,
      "filename": "image-1234567890.jpg",
      "original_filename": "photo.jpg",
      "file_path": "uploads/images/image-1234567890.jpg",
      "file_size": 1024000,
      "mime_type": "image/jpeg",
      "width": 1920,
      "height": 1080,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### GET /api/images/album/:albumId
アルバムの画像一覧を取得

#### DELETE /api/images/:id
画像を削除

### スライドショー

#### POST /api/slideshows/generate/:albumId
スライドショー動画を生成

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "slideshow_id": 1,
    "status": "processing",
    "message": "Slideshow generation started"
  }
}
```

#### GET /api/slideshows/album/:albumId
アルバムのスライドショー一覧を取得

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "slideshows": [
      {
        "id": 1,
        "album_id": 1,
        "filename": "slideshow-1.mp4",
        "file_path": "uploads/slideshows/slideshow-1.mp4",
        "file_size": 5000000,
        "duration": 30,
        "status": "completed",
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

#### GET /api/slideshows/:id
スライドショー詳細を取得

#### DELETE /api/slideshows/:id
スライドショーを削除

## エラーレスポンス

```json
{
  "success": false,
  "error": {
    "message": "エラーメッセージ"
  }
}
```

## ステータスコード

- 200: 成功
- 201: 作成成功
- 202: 処理開始（非同期処理）
- 400: リクエストエラー
- 401: 認証エラー
- 403: 権限エラー
- 404: リソースが見つからない
- 500: サーバーエラー

