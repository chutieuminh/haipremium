import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config.js';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import { errorHandler, notFound } from './middleware.js';
import { success } from './utils.js';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

const allowedOrigins = env.frontendUrl.split(',').map((item) => item.trim()).filter(Boolean);
const isDevOrigin = (origin) => {
  if (env.nodeEnv === 'production') return false;
  return /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(origin)
    || /^http:\/\/(192\.168|10|172\.(1[6-9]|2\d|3[0-1]))\.\d+\.\d+:\d+$/.test(origin);
};
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || isDevOrigin(origin)) return callback(null, true);
    return callback(new Error('Nguồn truy cập không được phép bởi CORS.'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

const secretFields = new Set(['password', 'currentPassword', 'newPassword', 'activationCode', 'recoveryInfo']);
const sanitize = (value, key = '') => {
  if (secretFields.has(key)) return value;
  if (typeof value === 'string') return value.replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/javascript:/gi, '');
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, sanitize(child, childKey)]));
  return value;
};
app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) req.body = sanitize(req.body);
  next();
});

for (const folder of ['products', 'banners', 'avatars', 'settings']) {
  const directory = path.join(env.uploadDir, folder);
  fs.mkdirSync(directory, { recursive: true });
  app.use(`/uploads/${folder}`, express.static(directory, { fallthrough: false, maxAge: env.nodeEnv === 'production' ? '7d' : 0 }));
}

app.get('/api/v1/health', (_req, res) => success(res, { status: 'ok', environment: env.nodeEnv }, 'Hải Premium API đang hoạt động.'));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.nodeEnv === 'production' ? 80 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.', errors: [] },
});
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1', publicRoutes);
app.use('/api/v1', userRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
