import { StorageService, StorageConfig, UploadResult } from '../types/storage';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

export class LocalStorageService implements StorageService {
  private config: StorageConfig['local'];

  constructor(config: StorageConfig['local']) {
    if (!config) {
      throw new Error('Local storage config is required');
    }
    this.config = config;
  }

  async upload(file: Express.Multer.File, albumId: string): Promise<UploadResult> {
    const albumPath = path.join(this.config!.uploadPath, albumId);
    
    // アルバムディレクトリが存在しない場合は作成
    try {
      await fs.access(albumPath);
    } catch {
      await fs.mkdir(albumPath, { recursive: true });
    }

    // ファイル名を生成
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `image-${uniqueSuffix}${path.extname(file.originalname)}`;
    const filePath = path.join(albumPath, filename);

    // 画像を最適化して保存
    await sharp(file.buffer)
      .resize(1920, 1080, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toFile(filePath);

    // サムネイルも生成
    const thumbnailPath = path.join(albumPath, `thumb_${filename}`);
    await sharp(file.buffer)
      .resize(300, 300, { 
        fit: 'cover' 
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    const url = `${this.config!.publicPath}/${albumId}/${filename}`;

    return {
      filename,
      originalName: file.originalname,
      path: filePath,
      url,
      size: file.size,
      mimeType: file.mimetype
    };
  }

  async delete(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      
      // サムネイルも削除
      const dir = path.dirname(filePath);
      const filename = path.basename(filePath);
      const thumbnailPath = path.join(dir, `thumb_${filename}`);
      
      try {
        await fs.unlink(thumbnailPath);
      } catch {
        // サムネイルが存在しない場合は無視
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  getUrl(filePath: string): string {
    const relativePath = path.relative(this.config!.uploadPath, filePath);
    return `${this.config!.publicPath}/${relativePath.replace(/\\/g, '/')}`;
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
