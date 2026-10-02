const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.post('/add', requireAuth, cartController.addToCart);
router.get('/', requireAuth, cartController.getCartItems);
router.get('/:userId', requireAuth, cartController.getCartItems);
router.put('/:cartItemId', requireAuth, cartController.updateCartItem);
router.delete('/:cartItemId', requireAuth, cartController.removeCartItem);

module.exports = router;
