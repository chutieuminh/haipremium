import express from 'express';
import path from 'node:path';
import { body } from 'express-validator';
import { Op } from 'sequelize';
import { sequelize } from '../config.js';
import {
  Cart, CartItem, Category, Coupon, CouponUsage, Favorite, Inventory, Order, OrderDelivery,
  OrderItem, Payment, Product, ProductPackage, Review, SupportRequest, User,
} from '../models.js';
import { authenticate, imageUpload, validate } from '../middleware.js';
import {
  AppError, asyncHandler, audit, calculateCoupon, decryptSecret, numberValue,
  serializeOrder, serializeProduct, success,
} from '../utils.js';

const router = express.Router();
router.use(authenticate);

const productInclude = [
  { model: Category, as: 'category', attributes: ['id', 'code', 'name', 'slug'] },
  { model: ProductPackage, as: 'packages', required: false, where: { isActive: true } },
];

const cartInclude = [{
  model: CartItem,
  as: 'items',
  include: [{
    model: ProductPackage,
    as: 'package',
    include: [{ model: Product, as: 'product', include: [{ model: Category, as: 'category' }] }],
  }],
}];

const serializeCart = (cart) => {
  const plain = cart.get({ plain: true });
  return (plain.items || []).map((item) => {
    const pkg = item.package;
    const product = pkg.product;
    return {
      id: item.id,
      key: `db-${item.id}`,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      logo: product.logo,
      packageId: pkg.id,
      packageLabel: pkg.name.includes('—') ? pkg.name.split('—').pop().trim() : pkg.name,
      accountType: pkg.accountType,
      price: numberValue(pkg.salePrice),
      quantity: item.quantity,
      stock: pkg.stock,
    };
  });
};

const getCart = async (userId, transaction) => {
  const [cart] = await Cart.findOrCreate({ where: { userId }, defaults: { userId }, transaction });
  return Cart.findByPk(cart.id, { include: cartInclude, transaction });
};

router.get('/cart', asyncHandler(async (req, res) => {
  const cart = await getCart(req.user.id);
  return success(res, serializeCart(cart));
}));

router.post('/cart/items', [
  body('packageId').isInt({ min: 1 }).withMessage('Gói sản phẩm không hợp lệ.'),
  body('quantity').optional().isInt({ min: 1, max: 99 }).withMessage('Số lượng không hợp lệ.'),
], validate, asyncHandler(async (req, res) => {
  const quantity = Number(req.body.quantity || 1);
  const pkg = await ProductPackage.findOne({ where: { id: req.body.packageId, isActive: true } });
  if (!pkg) throw new AppError('Gói sản phẩm không tồn tại.', 404);
  const cart = await getCart(req.user.id);
  let item = await CartItem.findOne({ where: { cartId: cart.id, packageId: pkg.id } });
  const newQuantity = (item?.quantity || 0) + quantity;
  if (newQuantity > pkg.stock) throw new AppError('Số lượng vượt quá tồn kho hiện có.', 422);
  if (item) {
    item.quantity = newQuantity;
    await item.save();
  } else {
    item = await CartItem.create({ cartId: cart.id, packageId: pkg.id, quantity });
  }
  const fresh = await getCart(req.user.id);
  return success(res, serializeCart(fresh), 'Đã thêm sản phẩm vào giỏ hàng.', 201);
}));

router.put('/cart/items/:id', [body('quantity').isInt({ min: 1, max: 99 }).withMessage('Số lượng không hợp lệ.')], validate, asyncHandler(async (req, res) => {
  const cart = await getCart(req.user.id);
  const item = await CartItem.findOne({ where: { id: req.params.id, cartId: cart.id }, include: [{ model: ProductPackage, as: 'package' }] });
  if (!item) throw new AppError('Không tìm thấy sản phẩm trong giỏ.', 404);
  if (Number(req.body.quantity) > item.package.stock) throw new AppError('Số lượng vượt quá tồn kho hiện có.', 422);
  item.quantity = Number(req.body.quantity);
  await item.save();
  return success(res, serializeCart(await getCart(req.user.id)), 'Đã cập nhật giỏ hàng.');
}));

router.delete('/cart/items/:id', asyncHandler(async (req, res) => {
  const cart = await getCart(req.user.id);
  const deleted = await CartItem.destroy({ where: { id: req.params.id, cartId: cart.id } });
  if (!deleted) throw new AppError('Không tìm thấy sản phẩm trong giỏ.', 404);
  return success(res, serializeCart(await getCart(req.user.id)), 'Đã xóa sản phẩm khỏi giỏ hàng.');
}));

router.delete('/cart', asyncHandler(async (req, res) => {
  const cart = await getCart(req.user.id);
  await CartItem.destroy({ where: { cartId: cart.id } });
  return success(res, [], 'Đã xóa toàn bộ giỏ hàng.');
}));

router.post('/cart/sync', [body('items').isArray({ max: 50 }).withMessage('Danh sách giỏ hàng không hợp lệ.')], validate, asyncHandler(async (req, res) => {
  const cart = await getCart(req.user.id);
  for (const incoming of req.body.items) {
    const pkg = await ProductPackage.findOne({ where: { id: incoming.packageId, isActive: true } });
    if (!pkg) continue;
    const quantity = Math.min(Math.max(1, Number(incoming.quantity || 1)), pkg.stock);
    const [item, created] = await CartItem.findOrCreate({ where: { cartId: cart.id, packageId: pkg.id }, defaults: { quantity } });
    if (!created) {
      item.quantity = Math.min(pkg.stock, item.quantity + quantity);
      await item.save();
    }
  }
  return success(res, serializeCart(await getCart(req.user.id)), 'Đã đồng bộ giỏ hàng.');
}));

router.get('/favorites', asyncHandler(async (req, res) => {
  const favorites = await Favorite.findAll({ where: { userId: req.user.id }, include: [{ model: Product, as: 'product', include: productInclude }] });
  return success(res, favorites.map((item) => serializeProduct(item.product)));
}));

router.post('/favorites/:productId', asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.productId);
  if (!product || product.status !== 'active') throw new AppError('Sản phẩm không tồn tại.', 404);
  await Favorite.findOrCreate({ where: { userId: req.user.id, productId: product.id } });
  return success(res, { productId: product.id }, 'Đã thêm vào danh sách yêu thích.', 201);
}));

router.delete('/favorites/:productId', asyncHandler(async (req, res) => {
  await Favorite.destroy({ where: { userId: req.user.id, productId: req.params.productId } });
  return success(res, { productId: Number(req.params.productId) }, 'Đã bỏ khỏi danh sách yêu thích.');
}));

const findValidCoupon = async (code, subtotal, userId) => {
  if (!code) return null;
  const now = new Date();
  const coupon = await Coupon.findOne({ where: {
    code: String(code).trim().toUpperCase(),
    isActive: true,
    [Op.and]: [
      { [Op.or]: [{ startDate: null }, { startDate: { [Op.lte]: now } }] },
      { [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: now } }] },
    ],
  } });
  if (!coupon) throw new AppError('Mã giảm giá không hợp lệ hoặc đã hết hạn.', 422);
  if (Number(subtotal) < Number(coupon.minimumOrderValue || 0)) throw new AppError(`Đơn hàng chưa đạt giá trị tối thiểu ${Number(coupon.minimumOrderValue).toLocaleString('vi-VN')}đ.`, 422);
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new AppError('Mã giảm giá đã hết lượt sử dụng.', 422);
  const userUsage = await CouponUsage.count({ where: { couponId: coupon.id, userId } });
  if (userUsage >= coupon.usageLimitPerUser) throw new AppError('Bạn đã sử dụng hết lượt của mã giảm giá này.', 422);
  return coupon;
};

router.post('/coupons/validate', [
  body('code').trim().notEmpty().withMessage('Vui lòng nhập mã giảm giá.'),
  body('subtotal').isFloat({ min: 0 }).withMessage('Giá trị đơn hàng không hợp lệ.'),
], validate, asyncHandler(async (req, res) => {
  const coupon = await findValidCoupon(req.body.code, req.body.subtotal, req.user.id);
  const discountAmount = calculateCoupon(coupon, req.body.subtotal);
  return success(res, { coupon: coupon.toJSON(), discountAmount, total: Number(req.body.subtotal) - discountAmount }, 'Áp dụng mã giảm giá thành công.');
}));

const orderInclude = [
  { model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'phone'] },
  { model: OrderItem, as: 'items', include: [
    { model: Product, as: 'product', include: productInclude },
    { model: ProductPackage, as: 'package' },
    { model: OrderDelivery, as: 'deliveries', required: false },
  ] },
  { model: Payment, as: 'payments' },
];

const makeOrderCode = async () => {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const code = `HP${date}${suffix}`;
    if (!(await Order.findOne({ where: { orderCode: code } }))) return code;
  }
  return `HP${date}${String(Date.now()).slice(-6)}`;
};

router.post('/orders', [
  body('customerName').trim().isLength({ min: 2, max: 120 }).withMessage('Họ tên không hợp lệ.'),
  body('customerEmail').isEmail().normalizeEmail().withMessage('Email không hợp lệ.'),
  body('customerPhone').trim().isLength({ min: 8, max: 30 }).withMessage('Số điện thoại không hợp lệ.'),
  body('paymentMethod').isIn(['bank', 'qr']).withMessage('Phương thức thanh toán không hợp lệ.'),
  body('couponCode').optional({ checkFalsy: true }).trim(),
], validate, asyncHandler(async (req, res) => {
  const createdOrder = await sequelize.transaction(async (transaction) => {
    const cart = await getCart(req.user.id, transaction);
    const cartItems = serializeCart(cart);
    if (!cartItems.length) throw new AppError('Giỏ hàng đang trống.', 422);

    const lockedPackages = [];
    let subtotal = 0;
    for (const item of cartItems) {
      const pkg = await ProductPackage.findByPk(item.packageId, {
        include: [{ model: Product, as: 'product' }],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!pkg || !pkg.isActive || pkg.product.status !== 'active') throw new AppError(`Gói ${item.packageLabel} không còn khả dụng.`, 422);
      if (pkg.stock < item.quantity) throw new AppError(`${pkg.name} không đủ số lượng tồn kho.`, 422);
      subtotal += Number(pkg.salePrice) * item.quantity;
      lockedPackages.push({ pkg, quantity: item.quantity });
    }

    const coupon = await findValidCoupon(req.body.couponCode, subtotal, req.user.id);
    const discountAmount = calculateCoupon(coupon, subtotal);
    const order = await Order.create({
      orderCode: await makeOrderCode(),
      userId: req.user.id,
      customerName: req.body.customerName,
      customerEmail: req.body.customerEmail,
      customerPhone: req.body.customerPhone,
      note: req.body.note || null,
      couponId: coupon?.id || null,
      subtotal,
      discountAmount,
      total: subtotal - discountAmount,
      paymentMethod: req.body.paymentMethod,
    }, { transaction });

    for (const { pkg, quantity } of lockedPackages) {
      await OrderItem.create({
        orderId: order.id,
        productId: pkg.product.id,
        packageId: pkg.id,
        productName: pkg.product.name,
        productSlug: pkg.product.slug,
        packageName: pkg.name,
        accountType: pkg.accountType,
        unitPrice: pkg.salePrice,
        quantity,
        lineTotal: Number(pkg.salePrice) * quantity,
      }, { transaction });
      pkg.stock -= quantity;
      await pkg.save({ transaction });
    }

    await Payment.create({ orderId: order.id, method: req.body.paymentMethod, amount: order.total, status: 'pending' }, { transaction });
    if (coupon) {
      await CouponUsage.create({ couponId: coupon.id, userId: req.user.id, orderId: order.id, discountAmount }, { transaction });
      coupon.usedCount += 1;
      await coupon.save({ transaction });
    }
    await CartItem.destroy({ where: { cartId: cart.id }, transaction });
    return order;
  });
  const order = await Order.findByPk(createdOrder.id, { include: orderInclude });
  await audit(req, 'ORDER_CREATED', 'Order', order.id, { orderCode: order.orderCode, total: order.total });
  return success(res, serializeOrder(order), 'Tạo đơn hàng thành công.', 201);
}));

router.get('/orders/my-orders', asyncHandler(async (req, res) => {
  const orders = await Order.findAll({ where: { userId: req.user.id }, include: orderInclude, order: [['createdAt', 'DESC']] });
  return success(res, orders.map((order) => serializeOrder(order)));
}));

router.get('/orders/:orderCode', asyncHandler(async (req, res) => {
  const order = await Order.findOne({ where: { orderCode: req.params.orderCode, userId: req.user.id }, include: orderInclude });
  if (!order) throw new AppError('Không tìm thấy đơn hàng.', 404);
  return success(res, serializeOrder(order));
}));

router.post('/orders/:orderCode/payment-proof', imageUpload('payment-proofs').single('proof'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Vui lòng chọn ảnh biên lai.', 422);
  const order = await Order.findOne({ where: { orderCode: req.params.orderCode, userId: req.user.id } });
  if (!order) throw new AppError('Không tìm thấy đơn hàng.', 404);
  if (!['pending_payment', 'payment_review'].includes(order.orderStatus)) throw new AppError('Đơn hàng không còn ở trạng thái chờ thanh toán.', 422);
  const relative = `/uploads/payment-proofs/${path.basename(req.file.path)}`;
  order.paymentProofPath = relative;
  order.paymentStatus = 'review';
  order.orderStatus = 'payment_review';
  await order.save();
  await Payment.update({ proofPath: relative, status: 'review' }, { where: { orderId: order.id } });
  await audit(req, 'PAYMENT_PROOF_UPLOADED', 'Order', order.id);
  return success(res, { orderCode: order.orderCode, paymentProofPath: relative, orderStatus: order.orderStatus }, 'Đã gửi biên lai, vui lòng chờ quản trị viên xác nhận.');
}));

router.post('/orders/:orderCode/confirm-transfer', asyncHandler(async (req, res) => {
  const order = await Order.findOne({ where: { orderCode: req.params.orderCode, userId: req.user.id } });
  if (!order) throw new AppError('Không tìm thấy đơn hàng.', 404);
  if (order.orderStatus !== 'pending_payment') throw new AppError('Không thể cập nhật trạng thái đơn hàng.', 422);
  order.paymentStatus = 'review';
  order.orderStatus = 'payment_review';
  await order.save();
  await Payment.update({ status: 'review' }, { where: { orderId: order.id } });
  return success(res, { orderCode: order.orderCode, orderStatus: order.orderStatus }, 'Đã ghi nhận yêu cầu xác nhận chuyển khoản.');
}));

router.get('/orders/:orderCode/deliveries', asyncHandler(async (req, res) => {
  const order = await Order.findOne({ where: { orderCode: req.params.orderCode, userId: req.user.id } });
  if (!order) throw new AppError('Không tìm thấy đơn hàng.', 404);
  if (order.orderStatus !== 'completed') throw new AppError('Đơn hàng chưa hoàn thành bàn giao.', 422);
  const deliveries = await OrderDelivery.findAll({
    where: { userId: req.user.id },
    include: [{
      model: OrderItem,
      as: 'orderItem',
      required: true,
      where: { orderId: order.id },
    }, { model: Inventory, as: 'inventory' }],
  });
  const data = deliveries.map((delivery) => ({
    id: delivery.id,
    productName: delivery.orderItem.productName,
    packageName: delivery.orderItem.packageName,
    deliveredAt: delivery.deliveredAt,
    expiresAt: delivery.inventory.expiresAt,
    type: delivery.inventory.type,
    loginEmail: delivery.inventory.loginEmail,
    loginUsername: delivery.inventory.loginUsername,
    password: decryptSecret(delivery.inventory.encryptedPassword),
    activationCode: decryptSecret(delivery.inventory.encryptedActivationCode),
    recoveryInfo: decryptSecret(delivery.inventory.encryptedRecoveryInfo),
    additionalInformation: delivery.inventory.additionalInformation,
  }));
  if (deliveries.length) await OrderDelivery.update({ viewedAt: new Date() }, { where: { id: { [Op.in]: deliveries.map((item) => item.id) } } });
  await audit(req, 'SENSITIVE_DELIVERY_VIEWED', 'Order', order.id, { deliveryCount: data.length });
  return success(res, data);
}));

router.post('/reviews', [
  body('orderItemId').isInt({ min: 1 }).withMessage('Sản phẩm trong đơn hàng không hợp lệ.'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Số sao phải từ 1 đến 5.'),
  body('content').trim().isLength({ min: 5, max: 2000 }).withMessage('Nội dung đánh giá phải có ít nhất 5 ký tự.'),
], validate, asyncHandler(async (req, res) => {
  const orderItem = await OrderItem.findOne({
    where: { id: req.body.orderItemId },
    include: [{ model: Order, as: 'order', where: { userId: req.user.id, orderStatus: 'completed' } }],
  });
  if (!orderItem) throw new AppError('Bạn chỉ có thể đánh giá sản phẩm đã mua và hoàn thành.', 403);
  const [review, created] = await Review.findOrCreate({
    where: { orderItemId: orderItem.id },
    defaults: { userId: req.user.id, productId: orderItem.productId, rating: req.body.rating, content: req.body.content },
  });
  if (!created) throw new AppError('Sản phẩm trong đơn hàng này đã được đánh giá.', 409);
  const allReviews = await Review.findAll({ where: { productId: orderItem.productId, isVisible: true } });
  const average = allReviews.reduce((sum, item) => sum + item.rating, 0) / allReviews.length;
  await Product.update({ averageRating: average, reviewCount: allReviews.length }, { where: { id: orderItem.productId } });
  return success(res, review, 'Cảm ơn bạn đã gửi đánh giá.', 201);
}));

router.put('/reviews/:id', [
  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('content').optional().trim().isLength({ min: 5, max: 2000 }),
], validate, asyncHandler(async (req, res) => {
  const review = await Review.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!review) throw new AppError('Không tìm thấy đánh giá.', 404);
  if (req.body.rating !== undefined) review.rating = req.body.rating;
  if (req.body.content !== undefined) review.content = req.body.content;
  await review.save();
  return success(res, review, 'Đã cập nhật đánh giá.');
}));

router.delete('/reviews/:id', asyncHandler(async (req, res) => {
  const review = await Review.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!review) throw new AppError('Không tìm thấy đánh giá.', 404);
  await review.destroy();
  return success(res, null, 'Đã xóa đánh giá.');
}));

router.get('/support-requests', asyncHandler(async (req, res) => {
  const requests = await SupportRequest.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] });
  return success(res, requests);
}));

router.post('/support-requests', [
  body('subject').trim().isLength({ min: 3, max: 190 }).withMessage('Tiêu đề không hợp lệ.'),
  body('message').trim().isLength({ min: 10, max: 5000 }).withMessage('Nội dung phải có ít nhất 10 ký tự.'),
  body('orderId').optional({ checkFalsy: true }).isInt({ min: 1 }),
], validate, asyncHandler(async (req, res) => {
  if (req.body.orderId) {
    const order = await Order.findOne({ where: { id: req.body.orderId, userId: req.user.id } });
    if (!order) throw new AppError('Đơn hàng không thuộc tài khoản của bạn.', 403);
  }
  const request = await SupportRequest.create({ userId: req.user.id, orderId: req.body.orderId || null, subject: req.body.subject, message: req.body.message });
  return success(res, request, 'Đã gửi yêu cầu hỗ trợ.', 201);
}));

export default router;
