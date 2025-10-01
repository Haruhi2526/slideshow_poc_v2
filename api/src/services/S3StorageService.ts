import { StorageService, StorageConfig, UploadResult } from '../types/storage';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import path from 'path';

export class S3StorageService implements StorageService {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;

  constructor(config: StorageConfig['s3']) {
    this.bucket = config!.bucket;
    this.region = config!.region;

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: config!.accessKeyId,
        secretAccessKey: config!.secretAccessKey,
      },
      endpoint: config!.endpoint,
    });
  }

  async upload(file: Express.Multer.File, albumId: string): Promise<UploadResult> {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `image-${uniqueSuffix}${path.extname(file.originalname)}`;
    const key = `albums/${albumId}/${filename}`;

    // 画像を最適化
    const optimizedBuffer = await sharp(file.buffer)
      .resize(1920, 1080, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // メイン画像をアップロード
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: optimizedBuffer,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
    }));

    // サムネイルも生成・アップロード
    const thumbnailBuffer = await sharp(file.buffer)
      .resize(300, 300, { 
        fit: 'cover' 
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    const thumbnailKey = `albums/${albumId}/thumb_${filename}`;
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
    }));

    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    return {
      filename,
      originalName: file.originalname,
      path: key,
      url,
      size: optimizedBuffer.length,
      mimeType: 'image/jpeg'
    };
  }

  async delete(key: string): Promise<void> {
    try {
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));

      // サムネイルも削除
      const thumbnailKey = key.replace(/\/image-/, '/thumb_image-');
      try {
        await this.s3Client.send(new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: thumbnailKey,
        }));
      } catch {
        // サムネイルが存在しない場合は無視
      }
    } catch (error) {
      console.error('Failed to delete file from S3:', error);
      throw error;
    }
  }

  getUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      return true;
    } catch {
      return false;
    }
  }
}
