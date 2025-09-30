import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getPool } from '../utils/database';

const router = Router();

// アップロード設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/images/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
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
    // 画像のメタデータ取得
    const imageInfo = await sharp(req.file.path).metadata();
    
    // データベースに画像情報を保存
    const [result] = await pool.execute(
      'INSERT INTO images (album_id, filename, original_filename, file_path, file_size, mime_type, width, height) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        albumId,
        req.file.filename,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        imageInfo.width,
        imageInfo.height
      ]
    );

    const insertResult = result as any;
    res.status(201).json({
      success: true,
      data: {
        image: {
          id: insertResult.insertId,
          album_id: albumId,
          filename: req.file.filename,
          original_filename: req.file.originalname,
          file_path: req.file.path,
          file_size: req.file.size,
          mime_type: req.file.mimetype,
          width: imageInfo.width,
          height: imageInfo.height,
          created_at: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to process image' }
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
    'SELECT * FROM images WHERE album_id = ? ORDER BY created_at ASC',
    [albumId]
  );

  res.json({
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

  // データベースから削除
  await pool.execute('DELETE FROM images WHERE id = ?', [id]);

  // ファイルも削除（実際の実装では fs.unlink を使用）
  // fs.unlinkSync(image.file_path);

  res.json({
    success: true,
    data: { message: 'Image deleted successfully' }
  });
}));

export default router;

