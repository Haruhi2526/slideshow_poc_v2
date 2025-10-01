import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getPool } from '../utils/database';

const router = Router();

// LINE Login認証URL生成
router.get('/line/login', asyncHandler(async (req: Request, res: Response) => {
  const channelId = process.env.LINE_CHANNEL_ID;
  const redirectUri = process.env.LINE_REDIRECT_URI || 'http://localhost:3000/auth/callback';
  const scope = process.env.LINE_SCOPE || 'profile%20openid';
  const state = Math.random().toString(36).substring(2, 15);
  
  const lineLoginUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`;
  
  res.json({
    success: true,
    data: {
      loginUrl: lineLoginUrl,
      state
    }
  });
}));

// LINE認証コールバック処理
router.post('/line/callback', asyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.body;
  
  if (!code) {
    return res.status(400).json({
      success: false,
      error: { message: 'Authorization code is required' }
    });
  }

  try {
    // アクセストークンを取得
    const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token', {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.LINE_REDIRECT_URI || 'http://localhost:3000/auth/callback',
      client_id: process.env.LINE_CHANNEL_ID,
      client_secret: process.env.LINE_CHANNEL_SECRET
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, id_token } = tokenResponse.data;

    // ユーザー情報を取得
    const profileResponse = await axios.get('https://api.line.me/v2/profile', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    const { userId, displayName, pictureUrl } = profileResponse.data;

    const pool = getPool();
    
    // ユーザーを検索または作成
    let [rows] = await pool.execute(
      'SELECT * FROM users WHERE line_user_id = ?',
      [userId]
    );

    let user = (rows as any[])[0];

    if (!user) {
      // 新規ユーザー作成
      [rows] = await pool.execute(
        'INSERT INTO users (line_user_id, display_name, picture_url) VALUES (?, ?, ?)',
        [userId, displayName || '', pictureUrl || '']
      );
      
      const insertResult = rows as any;
      user = {
        id: insertResult.insertId,
        line_user_id: userId,
        display_name: displayName || '',
        picture_url: pictureUrl || ''
      };
    } else {
      // 既存ユーザーの情報を更新
      [rows] = await pool.execute(
        'UPDATE users SET display_name = ?, picture_url = ? WHERE line_user_id = ?',
        [displayName || '', pictureUrl || '', userId]
      );
      
      user = {
        ...user,
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

  } catch (error) {
    console.error('LINE authentication error:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'LINE authentication failed' }
    });
  }
}));

// LINE認証（簡易版 - テスト用）
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
  return res.json({
    success: true,
    data: {
      user: req.user
    }
  });
}));

export default router;
