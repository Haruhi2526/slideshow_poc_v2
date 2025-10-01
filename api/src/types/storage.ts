export interface StorageConfig {
  type: 'local' | 's3';
  local?: {
    uploadPath: string;
    publicPath: string;
  };
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string; // For S3-compatible services
  };
}

export interface UploadResult {
  filename: string;
  originalName: string;
  path: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface StorageService {
  upload(file: Express.Multer.File, albumId: string): Promise<UploadResult>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
  exists(path: string): Promise<boolean>;
}
