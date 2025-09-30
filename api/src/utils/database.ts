import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'slideshow_user',
  password: process.env.DB_PASSWORD || 'slideshow_password',
  database: process.env.DB_NAME || 'slideshow_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool: mysql.Pool;

export const connectDatabase = async (): Promise<void> => {
  try {
    pool = mysql.createPool(dbConfig);
    
    // 接続テスト
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

export const getPool = (): mysql.Pool => {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return pool;
};

export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    console.log('Database connection closed');
  }
};

