const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.get('/profile', requireAuth, userController.getProfile);
router.put('/profile', requireAuth, userController.updateProfile);
router.post('/addresses', requireAuth, userController.addAddress);
router.delete('/addresses/:addressId', requireAuth, userController.deleteAddress);

module.exports = router;
