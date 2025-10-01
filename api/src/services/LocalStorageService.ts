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
    try {
      console.log(`Starting upload for album ${albumId}, file: ${file.originalname}`);
      
      const albumPath = path.join(this.config!.uploadPath, albumId);
      console.log(`Album path: ${albumPath}`);
      
      // アルバムディレクトリが存在しない場合は作成
      try {
        await fs.access(albumPath);
        console.log(`Album directory exists: ${albumPath}`);
      } catch {
        console.log(`Creating album directory: ${albumPath}`);
        await fs.mkdir(albumPath, { recursive: true });
        console.log(`Album directory created successfully`);
      }

      // ファイル名を生成
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `image-${uniqueSuffix}${path.extname(file.originalname)}`;
      const filePath = path.join(albumPath, filename);
      console.log(`Generated filename: ${filename}, file path: ${filePath}`);

      // 画像を最適化して保存
      console.log(`Processing image with Sharp...`);
      await sharp(file.buffer)
        .resize(1920, 1080, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 85 })
        .toFile(filePath);
      console.log(`Image processed and saved successfully`);

      // サムネイルも生成
      const thumbnailPath = path.join(albumPath, `thumb_${filename}`);
      console.log(`Generating thumbnail: ${thumbnailPath}`);
      await sharp(file.buffer)
        .resize(300, 300, { 
          fit: 'cover' 
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
      console.log(`Thumbnail generated successfully`);

      const url = `${process.env.API_BASE_URL || 'http://localhost:3001'}${this.config!.publicPath}/${albumId}/${filename}`;
      console.log(`Upload completed successfully. URL: ${url}`);

      return {
        filename,
        originalName: file.originalname,
        path: filePath,
        url,
        size: file.size,
        mimeType: file.mimetype
      };
    } catch (error) {
      console.error('LocalStorageService upload error:', error);
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    return `${process.env.API_BASE_URL || 'http://localhost:3001'}${this.config!.publicPath}/${relativePath.replace(/\\/g, '/')}`;
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
