const express = require('express');
const router = express.Router();
const wilayaController = require('../controllers/wilayaController');
const { requireAdmin } = require('../middlewares/adminMiddleware');

router.get('/', wilayaController.getWilayas);
router.get('/:id', wilayaController.getWilayaById);
router.put('/:id', requireAdmin, wilayaController.updateWilayaPrice);

module.exports = router;
