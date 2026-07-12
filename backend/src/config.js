import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sequelize } from 'sequelize';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');

const isProduction = (process.env.NODE_ENV || 'development') === 'production';
const unsafeProductionValues = [
  ['JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET],
  ['JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET],
  ['INVENTORY_ENCRYPTION_KEY', process.env.INVENTORY_ENCRYPTION_KEY],
];
if (isProduction) {
  const missing = unsafeProductionValues.filter(([, value]) => !value || value.length < 32).map(([name]) => name);
  if (missing.length) throw new Error(`Thiếu biến môi trường production an toàn: ${missing.join(', ')}`);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5050),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'development-access-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'development-refresh-secret-change-me',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  inventoryKey: process.env.INVENTORY_ENCRYPTION_KEY || '',
  uploadDir: path.resolve(backendRoot, process.env.UPLOAD_DIR || 'uploads'),
};

export const sequelize = new Sequelize(
  process.env.DB_NAME || 'haipremium',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    timezone: '+07:00',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  },
);
