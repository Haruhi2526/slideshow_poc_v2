import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import albumRoutes from './routes/albums';
import imageRoutes from './routes/images';
import slideshowRoutes from './routes/slideshows';
import { errorHandler } from './middleware/errorHandler';
import { connectDatabase } from './utils/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// レート制限
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // リクエスト制限
  message: 'Too many requests from this IP, please try again later.',
});

// ミドルウェア
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静的ファイル配信（ローカルストレージの場合のみ）
if (process.env.STORAGE_TYPE !== 's3') {
  app.use('/uploads', express.static('uploads'));
}

// ルート
app.use('/api/auth', authRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/slideshows', slideshowRoutes);

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// エラーハンドリング
app.use(errorHandler);

// データベース接続とサーバー起動
const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

