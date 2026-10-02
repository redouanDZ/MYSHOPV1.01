const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/adminMiddleware');

// Public routes
router.post('/orders', orderController.createOrder);
router.get('/orders/status', orderController.trackOrder);
router.get('/admin/orders/export', requireAdmin, orderController.exportOrders);
router.get('/orders/:id', orderController.getOrderById);
router.get('/order-items/:orderId', orderController.getOrderItems);

// Authenticated customer routes
router.get('/orders', requireAuth, orderController.getOrders);

// Admin order status update & deletion
router.put('/orders/:id/status', requireAdmin, orderController.updateOrderStatus);
router.delete('/orders/:id', requireAdmin, orderController.deleteOrder);

module.exports = router;
