import { Router, Request, Response } from 'express';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getPool } from '../utils/database';

// FFmpegのパスを設定（Docker環境ではシステムのFFmpegを使用）
if (process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV) {
  // Docker環境ではシステムのFFmpegを使用
  ffmpeg.setFfmpegPath('ffmpeg');
} else {
  // ローカル開発環境ではffmpeg-staticを使用
  ffmpeg.setFfmpegPath(require('ffmpeg-static'));
}

const router = Router();

// スライドショー生成
router.post('/generate', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { albumId } = req.body;
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

  // アルバムの画像一覧取得
  const [imageRows] = await pool.execute(
    'SELECT * FROM images WHERE album_id = ? ORDER BY created_at ASC',
    [albumId]
  );

  const images = imageRows as any[];
  if (images.length === 0) {
    return res.status(400).json({
      success: false,
      error: { message: 'No images found in album' }
    });
  }

  // スライドショー作成タスクをデータベースに記録
  const [result] = await pool.execute(
    'INSERT INTO slideshows (album_id, filename, file_path, file_size, duration, status) VALUES (?, ?, ?, ?, ?, ?)',
    [albumId, '', '', 0, 0, 'processing']
  );

  const insertResult = result as any;
  const slideshowId = insertResult.insertId;

  // 非同期でスライドショー生成を開始
  generateSlideshowAsync(slideshowId, images, albumId);

  return res.status(202).json({
    success: true,
    data: {
      slideshow_id: slideshowId,
      status: 'processing',
      message: 'Slideshow generation started'
    }
  });
}));

// スライドショー生成（非同期）
const generateSlideshowAsync = async (slideshowId: number, images: any[], albumId: string) => {
  const pool = getPool();
  
  try {
    console.log(`Starting slideshow generation for ID: ${slideshowId}, Images: ${images.length}`);
    
    const outputPath = `uploads/slideshows/slideshow-${slideshowId}.mp4`;
    const filename = `slideshow-${slideshowId}.mp4`;

    // 出力ディレクトリを作成
    const fs = require('fs');
    const path = require('path');
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created output directory: ${outputDir}`);
    }

    // 画像ファイルの存在確認
    for (const image of images) {
      if (!fs.existsSync(image.file_path)) {
        throw new Error(`Image file not found: ${image.file_path}`);
      }
      console.log(`Image file exists: ${image.file_path}`);
    }

    // FFmpegでスライドショー生成（複数画像対応）
    await new Promise<void>((resolve, reject) => {
      console.log(`Starting FFmpeg process for slideshow ${slideshowId}`);
      
      const command = ffmpeg();

      // 全ての画像を入力として追加
      images.forEach((image, index) => {
        console.log(`Adding input ${index}: ${image.file_path}`);
        command.input(image.file_path);
      });

      // 複数画像のスライドショー生成（各画像2秒表示）
      const filterParts = images.map((_, index) => 
        `[${index}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,loop=loop=59:size=1:start=0[img${index}]`
      );
      
      // 画像を連結するフィルター
      const concatFilter = images.map((_, index) => `[img${index}]`).join('') + `concat=n=${images.length}:v=1:a=0[outv]`;
      
      const filterComplex = [...filterParts, concatFilter].join(';');
      console.log(`FFmpeg filter complex: ${filterComplex}`);

      command
        .complexFilter(filterComplex)
        .outputOptions([
          '-map [outv]',
          '-c:v libx264',
          '-pix_fmt yuv420p',
          '-r 30',
          '-preset fast',
          '-crf 23',
          '-t', `${images.length * 2}` // 各画像2秒、総時間 = 画像数 × 2秒
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg command started:', commandLine);
        })
        .on('progress', (progress) => {
          console.log(`FFmpeg progress: ${progress.percent || 0}% done`);
        })
        .on('end', () => {
          console.log(`Slideshow generation completed successfully: ${outputPath}`);
          resolve();
        })
        .on('error', (err: any) => {
          console.error('FFmpeg generation error:', err);
          console.error('Error details:', {
            message: err.message,
            code: err.code,
            signal: err.signal,
            killed: err.killed,
            cmd: err.cmd
          });
          reject(err);
        })
        .run();
    });

    // ファイルサイズ取得
    const stats = fs.statSync(outputPath);
    const fileSize = stats.size;

    // データベース更新
    await pool.execute(
      'UPDATE slideshows SET filename = ?, file_path = ?, file_size = ?, duration = ?, status = ? WHERE id = ?',
      [filename, outputPath, fileSize, images.length * 2, 'completed', slideshowId]
    );

    console.log(`Slideshow ${slideshowId} generated successfully`);
  } catch (error) {
    console.error('Slideshow generation failed:', error);
    
    // エラー状態に更新
    await pool.execute(
      'UPDATE slideshows SET status = ? WHERE id = ?',
      ['failed', slideshowId]
    );
  }
};

// 全スライドショー一覧取得
router.get('/', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const pool = getPool();

  const [rows] = await pool.execute(
    'SELECT s.* FROM slideshows s JOIN albums a ON s.album_id = a.id WHERE a.user_id = ? ORDER BY s.created_at DESC',
    [userId]
  );

  return res.json({
    success: true,
    data: { slideshows: rows }
  });
}));

// スライドショー一覧取得
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
    'SELECT * FROM slideshows WHERE album_id = ? ORDER BY created_at DESC',
    [albumId]
  );

  return res.json({
    success: true,
    data: { slideshows: rows }
  });
}));

// スライドショー詳細取得
router.get('/:id', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const pool = getPool();

  const [rows] = await pool.execute(
    'SELECT s.* FROM slideshows s JOIN albums a ON s.album_id = a.id WHERE s.id = ? AND a.user_id = ?',
    [id, userId]
  );

  const slideshow = (rows as any[])[0];
  if (!slideshow) {
    return res.status(404).json({
      success: false,
      error: { message: 'Slideshow not found' }
    });
  }

  return res.json({
    success: true,
    data: { slideshow }
  });
}));

// スライドショー状態確認
router.get('/status/:id', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const pool = getPool();

  const [rows] = await pool.execute(
    'SELECT s.* FROM slideshows s JOIN albums a ON s.album_id = a.id WHERE s.id = ? AND a.user_id = ?',
    [id, userId]
  );

  const slideshow = (rows as any[])[0];
  if (!slideshow) {
    return res.status(404).json({
      success: false,
      error: { message: 'Slideshow not found' }
    });
  }

  return res.json({
    success: true,
    data: { slideshow }
  });
}));

// OPTIONSリクエスト（プリフライト）対応
router.options('/play/:id', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// 一時的なトークン付きURL生成
router.post('/play/:id/temp-url', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const pool = getPool();

  // スライドショーの存在確認と所有権確認
  const [rows] = await pool.execute(
    'SELECT s.* FROM slideshows s JOIN albums a ON s.album_id = a.id WHERE s.id = ? AND a.user_id = ?',
    [id, userId]
  );

  const slideshow = (rows as any[])[0];
  if (!slideshow) {
    res.status(404).json({
      success: false,
      error: { message: 'Slideshow not found' }
    });
    return;
  }

  if (slideshow.status !== 'completed') {
    res.status(400).json({
      success: false,
      error: { message: 'Slideshow is not ready for playback' }
    });
    return;
  }

  // 一時的なトークンを生成（5分間有効）
  const tempToken = jwt.sign(
    { 
      slideshowId: id,
      userId: userId,
      type: 'temp_video_access'
    },
    process.env.JWT_SECRET!,
    { expiresIn: '5m' }
  );

  // 一時的なURLを生成
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const tempUrl = `${apiUrl}/api/slideshows/play-temp/${id}?token=${tempToken}`;

  res.json({
    success: true,
    data: {
      tempUrl: tempUrl,
      expiresIn: 300 // 5分（秒）
    }
  });
}));

// 一時的なトークン検証ミドルウェア
const authenticateTempToken = (req: Request, res: Response, next: Function) => {
  const token = req.query.token as string;
  
  if (!token) {
    res.status(401).json({
      success: false,
      error: { message: 'Temporary token required' }
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (decoded.type !== 'temp_video_access') {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid token type' }
      });
      return;
    }

    // リクエストオブジェクトにユーザー情報を追加
    (req as any).user = { id: decoded.userId };
    (req as any).slideshowId = decoded.slideshowId;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired token' }
    });
    return;
  }
};

// 一時的なトークン付き動画配信
router.get('/play-temp/:id', authenticateTempToken, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user.id;
  const pool = getPool();

  // スライドショーの存在確認と所有権確認
  const [rows] = await pool.execute(
    'SELECT s.* FROM slideshows s JOIN albums a ON s.album_id = a.id WHERE s.id = ? AND a.user_id = ?',
    [id, userId]
  );

  const slideshow = (rows as any[])[0];
  if (!slideshow) {
    return res.status(404).json({
      success: false,
      error: { message: 'Slideshow not found' }
    });
  }

  if (slideshow.status !== 'completed') {
    return res.status(400).json({
      success: false,
      error: { message: 'Slideshow is not ready for playback' }
    });
  }

  const filePath = slideshow.file_path;
  
  // ファイルの存在確認
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: { message: 'Video file not found' }
    });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // CORSヘッダーを設定
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

  if (range) {
    // Rangeリクエスト（ストリーミング再生）の処理
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
      'Cache-Control': 'no-cache',
    };
    res.writeHead(206, head);
    file.pipe(res);
    return;
  } else {
    // 通常のリクエスト
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
    return;
  }
}));

// スライドショー動画配信（元のエンドポイント - 後方互換性のため残す）
router.get('/play/:id', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const pool = getPool();

  const [rows] = await pool.execute(
    'SELECT s.* FROM slideshows s JOIN albums a ON s.album_id = a.id WHERE s.id = ? AND a.user_id = ?',
    [id, userId]
  );

  const slideshow = (rows as any[])[0];
  if (!slideshow) {
    return res.status(404).json({
      success: false,
      error: { message: 'Slideshow not found' }
    });
  }

  if (slideshow.status !== 'completed') {
    return res.status(400).json({
      success: false,
      error: { message: 'Slideshow is not ready for playback' }
    });
  }

  const filePath = slideshow.file_path;
  
  // ファイルの存在確認
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: { message: 'Video file not found' }
    });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // CORSヘッダーを設定
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

  if (range) {
    // Rangeリクエスト（ストリーミング再生）の処理
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
      'Cache-Control': 'no-cache',
    };
    res.writeHead(206, head);
    file.pipe(res);
    return;
  } else {
    // 通常のリクエスト
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
    return;
  }
}));

// スライドショー削除
router.delete('/:id', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const pool = getPool();

  const [rows] = await pool.execute(
    'SELECT s.* FROM slideshows s JOIN albums a ON s.album_id = a.id WHERE s.id = ? AND a.user_id = ?',
    [id, userId]
  );

  const slideshow = (rows as any[])[0];
  if (!slideshow) {
    return res.status(404).json({
      success: false,
      error: { message: 'Slideshow not found' }
    });
  }

  // データベースから削除
  await pool.execute('DELETE FROM slideshows WHERE id = ?', [id]);

  // ファイルも削除（実際の実装では fs.unlink を使用）
  // fs.unlinkSync(slideshow.file_path);

  return res.json({
    success: true,
    data: { message: 'Slideshow deleted successfully' }
  });
}));

export default router;

