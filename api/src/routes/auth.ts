import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getPool } from '../utils/database';

const router = Router();

// LINE認証（簡易版）
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { lineUserId, displayName, pictureUrl } = req.body;

  if (!lineUserId) {
    return res.status(400).json({
      success: false,
      error: { message: 'LINE User ID is required' }
    });
  }

  const pool = getPool();
  
  // ユーザーを検索または作成
  let [rows] = await pool.execute(
    'SELECT * FROM users WHERE line_user_id = ?',
    [lineUserId]
  );

  let user = (rows as any[])[0];

  if (!user) {
    // 新規ユーザー作成
    [rows] = await pool.execute(
      'INSERT INTO users (line_user_id, display_name, picture_url) VALUES (?, ?, ?)',
      [lineUserId, displayName || '', pictureUrl || '']
    );
    
    const insertResult = rows as any;
    user = {
      id: insertResult.insertId,
      line_user_id: lineUserId,
      display_name: displayName || '',
      picture_url: pictureUrl || ''
    };
  }

  // JWTトークン生成
  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );

  // ↓ ここに return を追加する
  return res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        line_user_id: user.line_user_id,
        display_name: user.display_name,
        picture_url: user.picture_url
      },
      token
    }
  });
}));

// ユーザー情報取得
router.get('/me', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
}));

export default router;
