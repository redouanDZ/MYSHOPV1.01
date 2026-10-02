const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/chargily/checkout', paymentController.createChargilyCheckout);
router.post('/chargily/webhook', paymentController.handleChargilyWebhook);

module.exports = router;
