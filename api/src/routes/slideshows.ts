import { Router, Request, Response } from 'express';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getPool } from '../utils/database';

const router = Router();

// スライドショー生成
router.post('/generate/:albumId', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
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
    const outputPath = `uploads/slideshows/slideshow-${slideshowId}.mp4`;
    const filename = `slideshow-${slideshowId}.mp4`;

    // FFmpegでスライドショー生成
    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg();

      // 画像を入力として追加
      images.forEach((image, index) => {
        command.input(image.file_path);
      });

      command
        .complexFilter([
          // 各画像を3秒間表示
          ...images.map((_, index) => `[${index}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[img${index}]`),
          // 画像を連結
          images.map((_, index) => `[img${index}]`).join('') + `concat=n=${images.length}:v=1:a=0[outv]`
        ])
        .outputOptions([
          '-map [outv]',
          '-c:v libx264',
          '-pix_fmt yuv420p',
          '-r 30'
        ])
        .output(outputPath)
        .on('end', () => {
          console.log('Slideshow generation completed');
          resolve();
        })
        .on('error', (err) => {
          console.error('Slideshow generation error:', err);
          reject(err);
        })
        .run();
    });

    // ファイルサイズ取得
    const fs = require('fs');
    const stats = fs.statSync(outputPath);
    const fileSize = stats.size;

    // データベース更新
    await pool.execute(
      'UPDATE slideshows SET filename = ?, file_path = ?, file_size = ?, duration = ?, status = ? WHERE id = ?',
      [filename, outputPath, fileSize, images.length * 3, 'completed', slideshowId]
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

