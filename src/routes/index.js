const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const productRoutes = require('./productRoutes');
const cartRoutes = require('./cartRoutes');
const orderRoutes = require('./orderRoutes');
const userRoutes = require('./userRoutes');
const wilayaRoutes = require('./wilayaRoutes');
const adminRoutes = require('./adminRoutes');
const paymentRoutes = require('./paymentRoutes');
const wishlistRoutes = require('./wishlistRoutes');
const couponRoutes = require('./couponRoutes');

// Mount routes
router.use('/', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/', orderRoutes);
router.use('/user', userRoutes);
router.use('/wilayas', wilayaRoutes);
router.use('/admin', adminRoutes);
router.use('/payments', paymentRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/coupons', couponRoutes);
router.get('/categories', require('../controllers/adminController').getCategories);
router.get('/settings', require('../controllers/adminController').getStoreSettings);

module.exports = router;
