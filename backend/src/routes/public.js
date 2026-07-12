import express from 'express';
import { Op, fn, col, literal } from 'sequelize';
import { Category, Product, ProductPackage, Review, User, Setting, Banner } from '../models.js';
import { asyncHandler, AppError, serializeProduct, success } from '../utils.js';

const router = express.Router();
const productInclude = [
  { model: Category, as: 'category', attributes: ['id', 'code', 'name', 'slug'] },
  { model: ProductPackage, as: 'packages', required: false, where: { isActive: true } },
];

router.get('/categories', asyncHandler(async (_req, res) => {
  const categories = await Category.findAll({ where: { isActive: true }, order: [['id', 'ASC']] });
  const counts = await Product.findAll({
    attributes: ['categoryId', [fn('COUNT', col('id')), 'count']],
    where: { status: 'active' },
    group: ['categoryId'],
    raw: true,
  });
  const countMap = Object.fromEntries(counts.map((item) => [item.categoryId, Number(item.count)]));
  return success(res, categories.map((item) => ({ ...item.toJSON(), productCount: countMap[item.id] || 0 })));
}));

router.get('/categories/:slug', asyncHandler(async (req, res) => {
  const category = await Category.findOne({ where: { [Op.or]: [{ slug: req.params.slug }, { code: req.params.slug }], isActive: true } });
  if (!category) throw new AppError('Không tìm thấy danh mục.', 404);
  const products = await Product.findAll({ where: { categoryId: category.id, status: 'active' }, include: productInclude, order: [['soldCount', 'DESC']] });
  return success(res, { ...category.toJSON(), products: products.map(serializeProduct) });
}));

router.get('/products', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 12)));
  const where = { status: 'active' };
  if (req.query.q) {
    const q = `%${String(req.query.q).trim()}%`;
    where[Op.or] = [{ name: { [Op.like]: q } }, { shortDescription: { [Op.like]: q } }];
  }
  if (req.query.featured === 'true') where.isFeatured = true;
  if (req.query.bestSeller === 'true') where.isBestSeller = true;
  if (req.query.maxPrice) where.basePrice = { [Op.lte]: Number(req.query.maxPrice) };

  const include = [...productInclude];
  if (req.query.category) {
    include[0] = {
      ...include[0],
      required: true,
      where: { [Op.or]: [{ code: req.query.category }, { slug: req.query.category }] },
    };
  }

  const orderMap = {
    'price-asc': [['basePrice', 'ASC']],
    'price-desc': [['basePrice', 'DESC']],
    popular: [['soldCount', 'DESC']],
    rating: [['averageRating', 'DESC']],
    newest: [['createdAt', 'DESC']],
    discount: [[literal('(originalPrice - basePrice)'), 'DESC']],
    featured: [['isFeatured', 'DESC'], ['soldCount', 'DESC']],
  };
  const order = orderMap[req.query.sort] || orderMap.featured;
  const { rows, count } = await Product.findAndCountAll({ where, include, distinct: true, order, limit, offset: (page - 1) * limit });
  return success(res, rows.map(serializeProduct), 'Lấy danh sách sản phẩm thành công.', 200, {
    page,
    limit,
    totalItems: count,
    totalPages: Math.max(1, Math.ceil(count / limit)),
  });
}));

router.get('/products/featured/list', asyncHandler(async (_req, res) => {
  const products = await Product.findAll({ where: { status: 'active', isFeatured: true }, include: productInclude, order: [['soldCount', 'DESC']], limit: 12 });
  return success(res, products.map(serializeProduct));
}));

router.get('/products/best-sellers/list', asyncHandler(async (_req, res) => {
  const products = await Product.findAll({ where: { status: 'active', isBestSeller: true }, include: productInclude, order: [['soldCount', 'DESC']], limit: 12 });
  return success(res, products.map(serializeProduct));
}));


router.get('/products/featured', asyncHandler(async (_req, res) => {
  const products = await Product.findAll({ where: { status: 'active', isFeatured: true }, include: productInclude, order: [['soldCount', 'DESC']], limit: 12 });
  return success(res, products.map(serializeProduct));
}));

router.get('/products/best-sellers', asyncHandler(async (_req, res) => {
  const products = await Product.findAll({ where: { status: 'active', isBestSeller: true }, include: productInclude, order: [['soldCount', 'DESC']], limit: 12 });
  return success(res, products.map(serializeProduct));
}));

router.get('/products/:slug', asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    where: { slug: req.params.slug, status: 'active' },
    include: [
      ...productInclude,
      {
        model: Review,
        as: 'reviews',
        where: { isVisible: true },
        required: false,
        include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'avatar'] }],
      },
    ],
  });
  if (!product) throw new AppError('Không tìm thấy sản phẩm.', 404);
  await product.increment('viewCount');
  return success(res, serializeProduct(product, { includeReviews: true }));
}));

router.get('/products/:productId/packages', asyncHandler(async (req, res) => {
  const packages = await ProductPackage.findAll({ where: { productId: req.params.productId, isActive: true }, order: [['salePrice', 'ASC']] });
  return success(res, packages);
}));

router.get('/products/:productId/reviews', asyncHandler(async (req, res) => {
  const reviews = await Review.findAll({
    where: { productId: req.params.productId, isVisible: true },
    include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'avatar'] }],
    order: [['createdAt', 'DESC']],
  });
  return success(res, reviews);
}));

router.get('/settings/public', asyncHandler(async (_req, res) => {
  const allowed = ['site_name', 'slogan', 'support_email', 'hotline', 'facebook_url', 'zalo_url', 'bank_name', 'bank_account_name', 'bank_account_number', 'bank_qr_url', 'warranty_policy', 'terms'];
  const settings = await Setting.findAll({ where: { key: allowed } });
  return success(res, Object.fromEntries(settings.map((item) => [item.key, item.value])));
}));

router.get('/banners', asyncHandler(async (_req, res) => {
  const banners = await Banner.findAll({ where: { isActive: true }, order: [['sortOrder', 'ASC']] });
  return success(res, banners);
}));

export default router;
