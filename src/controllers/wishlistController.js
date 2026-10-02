const db = require('../data/db-connection.js');

async function getWishlist(req, res) {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: 'يجب تسجيل الدخول لعرض قائمة الرغبات', message: 'يجب تسجيل الدخول لعرض قائمة الرغبات', code: 'LOGIN_REQUIRED_WISHLIST' });
        }

        const items = await db.getWishlist(userId);
        res.json(items);
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({ error: 'خطأ في جلب قائمة الرغبات', message: 'خطأ في جلب قائمة الرغبات', code: 'WISHLIST_FETCH_FAILED' });
    }
}

async function addToWishlist(req, res) {
    try {
        const userId = req.userId;
        const productId = Number(req.params.productId);

        if (!productId || isNaN(productId)) {
            return res.status(400).json({ error: 'معرف المنتج غير صالح', message: 'معرف المنتج غير صالح', code: 'INVALID_PRODUCT_ID' });
        }

        const product = await db.getProductById(productId);
        if (!product) {
            return res.status(404).json({ error: 'المنتج غير موجود', message: 'المنتج غير موجود', code: 'PRODUCT_NOT_FOUND' });
        }

        await db.addToWishlist(userId, productId);
        res.status(201).json({
            message: 'تمت إضافة المنتج إلى قائمة الرغبات بنجاح',
            productId,
            inWishlist: true
        });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ error: 'خطأ في إضافة المنتج للمفضلة', message: 'خطأ في إضافة المنتج للمفضلة', code: 'WISHLIST_ADD_FAILED' });
    }
}

async function removeFromWishlist(req, res) {
    try {
        const userId = req.userId;
        const productId = Number(req.params.productId);

        if (!productId || isNaN(productId)) {
            return res.status(400).json({ error: 'معرف المنتج غير صالح', message: 'معرف المنتج غير صالح', code: 'INVALID_PRODUCT_ID' });
        }

        await db.removeFromWishlist(userId, productId);
        res.json({
            message: 'تمت إزالة المنتج من قائمة الرغبات بنجاح',
            productId,
            inWishlist: false
        });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ error: 'خطأ في إزالة المنتج من المفضلة', message: 'خطأ في إزالة المنتج من المفضلة', code: 'WISHLIST_REMOVE_FAILED' });
    }
}

async function checkWishlistStatus(req, res) {
    try {
        const userId = req.userId;
        const productId = Number(req.params.productId);

        if (!productId || isNaN(productId)) {
            return res.status(400).json({ error: 'معرف المنتج غير صالح', message: 'معرف المنتج غير صالح', code: 'INVALID_PRODUCT_ID' });
        }

        const inWishlist = await db.isInWishlist(userId, productId);
        res.json({ inWishlist });
    } catch (error) {
        console.error('Error checking wishlist status:', error);
        res.status(500).json({ error: 'خطأ في التحقق من حالة المفضلة', message: 'خطأ في التحقق من حالة المفضلة', code: 'WISHLIST_CHECK_FAILED' });
    }
}

module.exports = {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    checkWishlistStatus
};
