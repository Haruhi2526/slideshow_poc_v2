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

  return res.json({
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
  return res.status(201).json({
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

  // 画像一覧も取得（表示順序でソート）
  const [images] = await pool.execute(
    'SELECT * FROM images WHERE album_id = ? ORDER BY display_order ASC, created_at ASC',
    [id]
  );

  return res.json({
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

  return res.json({
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

  return res.json({
    success: true,
    data: { message: 'Album deleted successfully' }
  });
}));

// アルバムの画像一覧取得
router.get('/:id/images', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const pool = getPool();

  // アルバムの所有権確認
  const [albumRows] = await pool.execute(
    'SELECT * FROM albums WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  if ((albumRows as any[]).length === 0) {
    return res.status(404).json({
      success: false,
      error: { message: 'Album not found' }
    });
  }

  // 画像一覧取得
  const [images] = await pool.execute(
    'SELECT * FROM images WHERE album_id = ? ORDER BY display_order ASC, created_at ASC',
    [id]
  );

  return res.json({
    success: true,
    data: { images }
  });
}));

// 画像の順序変更と回転更新
router.put('/:id/images/reorder', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { images } = req.body;
  const userId = req.user!.id;
  const pool = getPool();

  // アルバムの所有権確認
  const [albumRows] = await pool.execute(
    'SELECT * FROM albums WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  if ((albumRows as any[]).length === 0) {
    return res.status(404).json({
      success: false,
      error: { message: 'Album not found' }
    });
  }

  // トランザクション開始
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 各画像の順序と回転を更新
    for (const imageData of images) {
      await connection.execute(
        'UPDATE images SET display_order = ?, rotation = ? WHERE id = ? AND album_id = ?',
        [imageData.order, imageData.rotation, imageData.id, id]
      );
    }

    await connection.commit();
    
    return res.json({
      success: true,
      data: { message: 'Images reordered successfully' }
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

export default router;

