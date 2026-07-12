import fs from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { env } from './config.js';
import { User } from './models.js';
import { AppError } from './utils.js';

export const validate = (req, _res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return next(new AppError('Dữ liệu gửi lên chưa hợp lệ.', 422, result.array().map((item) => ({ field: item.path, message: item.msg }))));
  }
  next();
};

export const authenticate = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw new AppError('Bạn cần đăng nhập để tiếp tục.', 401);
    const payload = jwt.verify(token, env.jwtAccessSecret);
    const user = await User.findByPk(payload.sub);
    if (!user || user.status !== 'active') throw new AppError('Tài khoản không tồn tại hoặc đã bị khóa.', 401);
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError('Phiên đăng nhập đã hết hạn.', 401));
  }
};

export const optionalAuthenticate = async (req, _res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next();
  try {
    const payload = jwt.verify(header.slice(7), env.jwtAccessSecret);
    req.user = await User.findByPk(payload.sub);
  } catch {
    req.user = null;
  }
  next();
};

export const requireAdmin = (req, _res, next) => {
  if (req.user?.role !== 'admin') return next(new AppError('Bạn không có quyền thực hiện thao tác này.', 403));
  next();
};

const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storageFor = (subfolder) => multer.diskStorage({
  destination: (_req, _file, callback) => {
    const target = path.join(env.uploadDir, subfolder);
    fs.mkdirSync(target, { recursive: true });
    callback(null, target);
  },
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    callback(null, `${uuidv4()}${ext}`);
  },
});

export const imageUpload = (subfolder) => multer({
  storage: storageFor(subfolder),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!imageMimeTypes.has(file.mimetype)) return callback(new AppError('Chỉ chấp nhận ảnh JPEG, PNG hoặc WEBP.', 422));
    callback(null, true);
  },
});

export const errorHandler = (error, _req, res, _next) => {
  let status = error.statusCode || 500;
  let message = error.message || 'Đã xảy ra lỗi máy chủ.';
  let errors = error.errors || [];

  if (error.name === 'SequelizeUniqueConstraintError') {
    status = 409;
    message = 'Dữ liệu đã tồn tại trong hệ thống.';
    errors = error.errors?.map((item) => ({ field: item.path, message: item.message })) || [];
  }
  if (error.name === 'SequelizeValidationError') {
    status = 422;
    message = 'Dữ liệu không hợp lệ.';
    errors = error.errors?.map((item) => ({ field: item.path, message: item.message })) || [];
  }
  if (error.code === 'LIMIT_FILE_SIZE') {
    status = 422;
    message = 'Ảnh tải lên không được vượt quá 5 MB.';
  }

  if (env.nodeEnv !== 'production' && status >= 500) console.error(error);
  return res.status(status).json({ success: false, message, errors });
};

export const notFound = (req, _res, next) => next(new AppError(`Không tìm thấy API ${req.method} ${req.originalUrl}.`, 404));
