import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import { env } from '../config.js';
import { Cart, RefreshToken, User } from '../models.js';
import { authenticate, validate } from '../middleware.js';
import {
  AppError, asyncHandler, clearRefreshCookie, decodeDurationMs, hashToken,
  safeUser, setRefreshCookie, signAccessToken, signRefreshToken, success,
} from '../utils.js';

const router = express.Router();

const authResponse = async (res, user, message) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await RefreshToken.create({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + decodeDurationMs(env.jwtRefreshExpiresIn)),
  });
  setRefreshCookie(res, refreshToken);
  return success(res, { user: safeUser(user), accessToken }, message);
};

router.post('/register', [
  body('fullName').trim().isLength({ min: 2, max: 120 }).withMessage('Họ tên phải có ít nhất 2 ký tự.'),
  body('email').isEmail().normalizeEmail().withMessage('Email không hợp lệ.'),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ min: 8, max: 30 }).withMessage('Số điện thoại không hợp lệ.'),
  body('password').isLength({ min: 8, max: 72 }).withMessage('Mật khẩu phải có ít nhất 8 ký tự.'),
], validate, asyncHandler(async (req, res) => {
  const { fullName, email, phone, password } = req.body;
  const exists = await User.findOne({ where: { email } });
  if (exists) throw new AppError('Email này đã được sử dụng.', 409);
  const user = await User.create({ fullName, email, phone, passwordHash: await bcrypt.hash(password, 12), role: 'customer' });
  await Cart.create({ userId: user.id });
  return authResponse(res, user, 'Đăng ký tài khoản thành công.');
}));

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Email không hợp lệ.'),
  body('password').notEmpty().withMessage('Vui lòng nhập mật khẩu.'),
], validate, asyncHandler(async (req, res) => {
  const user = await User.findOne({ where: { email: req.body.email } });
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    throw new AppError('Email hoặc mật khẩu không chính xác.', 401);
  }
  if (user.status !== 'active') throw new AppError('Tài khoản đã bị khóa.', 403);
  return authResponse(res, user, 'Đăng nhập thành công.');
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const token = req.cookies.hp_refresh;
  if (!token) throw new AppError('Không tìm thấy phiên đăng nhập.', 401);
  let payload;
  try {
    payload = jwt.verify(token, env.jwtRefreshSecret);
  } catch {
    clearRefreshCookie(res);
    throw new AppError('Phiên đăng nhập đã hết hạn.', 401);
  }
  const record = await RefreshToken.findOne({ where: { tokenHash: hashToken(token), revokedAt: null } });
  if (!record || record.expiresAt < new Date()) {
    clearRefreshCookie(res);
    throw new AppError('Phiên đăng nhập không còn hiệu lực.', 401);
  }
  const user = await User.findByPk(payload.sub);
  if (!user || user.status !== 'active') throw new AppError('Tài khoản không khả dụng.', 401);
  record.revokedAt = new Date();
  await record.save();
  return authResponse(res, user, 'Làm mới phiên đăng nhập thành công.');
}));

router.post('/logout', asyncHandler(async (req, res) => {
  const token = req.cookies.hp_refresh;
  if (token) await RefreshToken.update({ revokedAt: new Date() }, { where: { tokenHash: hashToken(token), revokedAt: null } });
  clearRefreshCookie(res);
  return success(res, null, 'Đã đăng xuất.');
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => success(res, safeUser(req.user))));

router.put('/profile', authenticate, [
  body('fullName').optional().trim().isLength({ min: 2, max: 120 }).withMessage('Họ tên không hợp lệ.'),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ min: 8, max: 30 }).withMessage('Số điện thoại không hợp lệ.'),
], validate, asyncHandler(async (req, res) => {
  const allowed = ['fullName', 'phone'];
  for (const key of allowed) if (req.body[key] !== undefined) req.user[key] = req.body[key];
  await req.user.save();
  return success(res, safeUser(req.user), 'Cập nhật thông tin thành công.');
}));

router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Vui lòng nhập mật khẩu hiện tại.'),
  body('newPassword').isLength({ min: 8, max: 72 }).withMessage('Mật khẩu mới phải có ít nhất 8 ký tự.'),
], validate, asyncHandler(async (req, res) => {
  if (!(await bcrypt.compare(req.body.currentPassword, req.user.passwordHash))) throw new AppError('Mật khẩu hiện tại không chính xác.', 422);
  req.user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  await req.user.save();
  await RefreshToken.update({ revokedAt: new Date() }, { where: { userId: req.user.id, revokedAt: null } });
  clearRefreshCookie(res);
  return success(res, null, 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
}));

export default router;
