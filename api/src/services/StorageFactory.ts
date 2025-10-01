import { StorageService, StorageConfig } from '../types/storage';
import { LocalStorageService } from './LocalStorageService';
import { S3StorageService } from './S3StorageService';

export class StorageFactory {
  static create(config: StorageConfig): StorageService {
    switch (config.type) {
      case 'local':
        return new LocalStorageService(config.local);
      case 's3':
        return new S3StorageService(config.s3);
      default:
        throw new Error(`Unsupported storage type: ${config.type}`);
    }
  }
}
