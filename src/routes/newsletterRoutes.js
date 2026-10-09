const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletterController.js');

// Public subscription endpoint
router.post('/subscribe', newsletterController.subscribe);

module.exports = router;
