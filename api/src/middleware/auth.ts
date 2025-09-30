import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getPool } from '../utils/database';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    line_user_id: string;
    display_name: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ success: false, error: { message: 'Access token required' } });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    const pool = getPool();
    
    const [rows] = await pool.execute(
      'SELECT id, line_user_id, display_name FROM users WHERE id = ?',
      [decoded.userId]
    );

    const user = (rows as any[])[0];
    if (!user) {
      res.status(401).json({ success: false, error: { message: 'User not found' } });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({ success: false, error: { message: 'Invalid token' } });
  }
};

