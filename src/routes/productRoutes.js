const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { requireAdmin } = require('../middlewares/adminMiddleware');
const { upload, validateUploadedImage } = require('../middlewares/uploadMiddleware');

const { requireAuth } = require('../middlewares/authMiddleware');

router.get('/autocomplete', productController.autocomplete);
router.get('/recommendations', productController.recommendations);
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.get('/:id/reviews', productController.getProductReviews);
router.post('/:id/reviews', requireAuth, productController.addProductReview);

// Product Variants Routes
router.get('/:id/variants', productController.getProductVariants);
router.post('/:id/variants', requireAdmin, upload.single('image'), validateUploadedImage, productController.createProductVariant);
router.put('/variants/:variantId', requireAdmin, upload.single('image'), validateUploadedImage, productController.updateProductVariant);
router.delete('/variants/:variantId', requireAdmin, productController.deleteProductVariant);

router.post('/', requireAdmin, upload.single('image'), validateUploadedImage, productController.createProduct);
router.put('/:id', requireAdmin, upload.single('image'), validateUploadedImage, productController.updateProduct);
router.delete('/:id', requireAdmin, productController.deleteProduct);

module.exports = router;
