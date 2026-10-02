const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/auth/google', authController.googleLogin);
router.post('/logout', authController.logout);
router.get('/csrf-token', authController.getCsrfToken);
router.post('/auth/verify-email', authController.verifyEmail);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);
router.post('/auth/refresh', authController.refreshSession);
router.get('/auth/session', authController.getSession);
router.get('/auth/sessions', requireAuth, authController.listSessions);
router.post('/auth/sessions/:sessionId/revoke', requireAuth, authController.revokeUserSession);

module.exports = router;
