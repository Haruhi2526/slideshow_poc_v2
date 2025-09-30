import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getPool } from '../utils/database';

const router = Router();

// アルバム一覧取得
router.get('/', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = getPool();
  const userId = req.user!.id;

  const [rows] = await pool.execute(
    'SELECT * FROM albums WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );

  res.json({
    success: true,
    data: { albums: rows }
  });
}));

// アルバム作成
router.post('/', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, description } = req.body;
  const userId = req.user!.id;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: { message: 'Album name is required' }
    });
  }

  const pool = getPool();
  const [result] = await pool.execute(
    'INSERT INTO albums (user_id, name, description) VALUES (?, ?, ?)',
    [userId, name, description || '']
  );

  const insertResult = result as any;
  res.status(201).json({
    success: true,
    data: {
      album: {
        id: insertResult.insertId,
        user_id: userId,
        name,
        description: description || '',
        created_at: new Date()
      }
    }
  });
}));

// アルバム詳細取得
router.get('/:id', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const pool = getPool();

  const [rows] = await pool.execute(
    'SELECT * FROM albums WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  const album = (rows as any[])[0];
  if (!album) {
    return res.status(404).json({
      success: false,
      error: { message: 'Album not found' }
    });
  }

  // 画像一覧も取得
  const [images] = await pool.execute(
    'SELECT * FROM images WHERE album_id = ? ORDER BY created_at ASC',
    [id]
  );

  res.json({
    success: true,
    data: {
      album: {
        ...album,
        images
      }
    }
  });
}));

// アルバム更新
router.put('/:id', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const userId = req.user!.id;
  const pool = getPool();

  const [result] = await pool.execute(
    'UPDATE albums SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    [name, description, id, userId]
  );

  const updateResult = result as any;
  if (updateResult.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: { message: 'Album not found' }
    });
  }

  res.json({
    success: true,
    data: { message: 'Album updated successfully' }
  });
}));

// アルバム削除
router.delete('/:id', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const pool = getPool();

  const [result] = await pool.execute(
    'DELETE FROM albums WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  const deleteResult = result as any;
  if (deleteResult.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: { message: 'Album not found' }
    });
  }

  res.json({
    success: true,
    data: { message: 'Album deleted successfully' }
  });
}));

export default router;

