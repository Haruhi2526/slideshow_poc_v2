import { StorageConfig } from '../types/storage';

export const storageConfig: StorageConfig = {
  type: process.env.STORAGE_TYPE === 's3' ? 's3' : 'local',
  local: {
    uploadPath: process.env.LOCAL_UPLOAD_PATH || 'uploads/images',
    publicPath: process.env.LOCAL_PUBLIC_PATH || '/uploads/images'
  },
  s3: {
    bucket: process.env.S3_BUCKET || '',
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    endpoint: process.env.S3_ENDPOINT
  }
};
