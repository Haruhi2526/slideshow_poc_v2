import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getPool } from '../utils/database';
import { StorageFactory } from '../services/StorageFactory';
import { storageConfig } from '../config/storage';

const router = Router();

// ストレージサービスを初期化
const storageService = StorageFactory.create(storageConfig);

// アップロード設定（メモリストレージを使用）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// 画像アップロード
router.post('/upload/:albumId', authenticateToken, upload.single('image'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { albumId } = req.params;
  const userId = req.user!.id;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: { message: 'No image file provided' }
    });
  }

  const pool = getPool();

  // アルバムの存在確認
  const [albumRows] = await pool.execute(
    'SELECT * FROM albums WHERE id = ? AND user_id = ?',
    [albumId, userId]
  );

  if ((albumRows as any[]).length === 0) {
    return res.status(404).json({
      success: false,
      error: { message: 'Album not found' }
    });
  }

  try {
    console.log(`Starting image upload for album ${albumId}, user ${userId}`);
    console.log(`File details: ${req.file.originalname}, size: ${req.file.size}, type: ${req.file.mimetype}`);
    
    // ストレージサービスを使用して画像をアップロード
    const uploadResult = await storageService.upload(req.file, albumId);
    console.log(`Storage upload completed: ${uploadResult.url}`);
    
    // データベースに画像情報を保存
    const [result] = await pool.execute(
      'INSERT INTO images (album_id, filename, original_filename, file_path, file_size, mime_type, width, height, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        albumId,
        uploadResult.filename,
        uploadResult.originalName,
        uploadResult.path,
        uploadResult.size,
        uploadResult.mimeType,
        0, // width - 必要に応じて取得
        0, // height - 必要に応じて取得
        uploadResult.url
      ]
    );

    const insertResult = result as any;
    console.log(`Image saved to database with ID: ${insertResult.insertId}`);
    
    return res.status(201).json({
      success: true,
      data: {
        image: {
          id: insertResult.insertId,
          album_id: albumId,
          filename: uploadResult.filename,
          original_filename: uploadResult.originalName,
          file_path: uploadResult.path,
          file_size: uploadResult.size,
          mime_type: uploadResult.mimeType,
          url: uploadResult.url,
          created_at: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Image processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process image';
    return res.status(500).json({
      success: false,
      error: { message: errorMessage }
    });
  }
}));

// 画像一覧取得
router.get('/album/:albumId', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { albumId } = req.params;
  const userId = req.user!.id;
  const pool = getPool();

  // アルバムの所有権確認
  const [albumRows] = await pool.execute(
    'SELECT * FROM albums WHERE id = ? AND user_id = ?',
    [albumId, userId]
  );

  if ((albumRows as any[]).length === 0) {
    return res.status(404).json({
      success: false,
      error: { message: 'Album not found' }
    });
  }

  const [rows] = await pool.execute(
    'SELECT * FROM images WHERE album_id = ? ORDER BY display_order ASC, created_at ASC',
    [albumId]
  );

  return res.json({
    success: true,
    data: { images: rows }
  });
}));

// 画像削除
router.delete('/:id', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const pool = getPool();

  // 画像の所有権確認
  const [rows] = await pool.execute(
    'SELECT i.* FROM images i JOIN albums a ON i.album_id = a.id WHERE i.id = ? AND a.user_id = ?',
    [id, userId]
  );

  const image = (rows as any[])[0];
  if (!image) {
    return res.status(404).json({
      success: false,
      error: { message: 'Image not found' }
    });
  }

  // ストレージからファイルを削除
  await storageService.delete(image.file_path);

  // データベースから削除
  await pool.execute('DELETE FROM images WHERE id = ?', [id]);

  return res.json({
    success: true,
    data: { message: 'Image deleted successfully' }
  });
}));

export default router;

