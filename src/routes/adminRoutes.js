const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middlewares/adminMiddleware');

const { upload, validateUploadedImage } = require('../middlewares/uploadMiddleware');

router.get('/dashboard-stats', requireAdmin, adminController.getDashboardStats);
router.get('/store-config', adminController.getPublicConfig);

// Orders Management
router.delete('/orders/:id', requireAdmin, require('../controllers/orderController').deleteOrder);

// Customers & Users Management
router.get('/users', requireAdmin, adminController.getAdminUsers);
router.get('/users/:id', requireAdmin, adminController.getAdminUserById);
router.put('/users/:id/role', requireAdmin, adminController.updateUserRole);
router.put('/users/:id/status', requireAdmin, adminController.updateUserStatus);
router.delete('/users/:id', requireAdmin, adminController.deleteUser);

// Categories Management
router.get('/categories', adminController.getCategories);
router.get('/categories/:id', requireAdmin, adminController.getCategoryById);
router.post('/categories', requireAdmin, adminController.createCategory);
router.put('/categories/:id', requireAdmin, adminController.updateCategory);
router.delete('/categories/:id', requireAdmin, adminController.deleteCategory);

// Coupons Management
router.get('/coupons', requireAdmin, adminController.getAdminCoupons);
router.post('/coupons', requireAdmin, adminController.createCoupon);
router.put('/coupons/:id', requireAdmin, adminController.updateCoupon);
router.delete('/coupons/:id', requireAdmin, adminController.deleteCoupon);

// Reviews Moderation
router.get('/reviews', requireAdmin, adminController.getAdminReviews);
router.put('/reviews/:id/status', requireAdmin, adminController.updateReviewStatus);
router.delete('/reviews/:id', requireAdmin, adminController.deleteReview);

// Store Settings & Marketing Pixels
router.get('/settings', requireAdmin, adminController.getStoreSettings);
router.put('/settings', requireAdmin, adminController.updateStoreSettings);
router.post('/upload-media', requireAdmin, upload.single('file'), validateUploadedImage, adminController.uploadMedia);
router.post('/test-telegram', requireAdmin, adminController.testTelegramAlert);

// Newsletter Subscribers
const newsletterController = require('../controllers/newsletterController');
router.get('/subscribers', requireAdmin, newsletterController.getAdminSubscribers);
router.delete('/subscribers/:id', requireAdmin, newsletterController.deleteAdminSubscriber);

module.exports = router;
