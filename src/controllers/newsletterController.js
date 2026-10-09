const db = require('../data/db-connection.js');

/**
 * الاشتراك في النشرة البريدية ونادي المتميزين
 * POST /api/newsletter/subscribe
 */
async function subscribe(req, res) {
    try {
        const rawEmail = String(req.body.email || '').trim().toLowerCase();
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

        if (!rawEmail || !emailRegex.test(rawEmail) || rawEmail.length > 191) {
            return res.status(400).json({
                success: false,
                error: 'يرجى إدخال بريد إلكتروني صالح',
                code: 'INVALID_EMAIL'
            });
        }

        const ipAddress = req.ip || (req.connection && req.connection.remoteAddress) || null;
        const discountCode = 'PROMO10';

        const result = await db.subscribeNewsletter({
            email: rawEmail,
            source: 'home_vip_club',
            discountCode,
            ipAddress
        });

        const isNew = !result.alreadySubscribed;
        const message = isNew
            ? 'تهانينا! لقد انضممت بنجاح إلى نادي المتميزين 🎉'
            : 'أهلاً بك مجدداً! أنت مسجل مسبقاً في نادي المتميزين';

        return res.status(200).json({
            success: true,
            alreadySubscribed: !isNew,
            discountCode,
            discountPercent: 10,
            message,
            coupon: {
                code: discountCode,
                discount: '10%',
                description: 'خصم 10% على إجمالي مشترياتك في السلة وعند الدفع'
            }
        });
    } catch (error) {
        console.error('Newsletter subscribe error:', error);
        return res.status(500).json({
            success: false,
            error: 'حدث خطأ أثناء معالجة الاشتراك، يرجى المحاولة لاحقاً',
            code: 'SERVER_ERROR'
        });
    }
}

/**
 * جلب قائمة المشتركين للوحة التحكم
 * GET /api/admin/newsletter-subscribers
 */
async function getAdminSubscribers(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const search = String(req.query.search || '').trim();

        const data = await db.getNewsletterSubscribers({ page, limit, search });
        return res.json({
            success: true,
            ...data
        });
    } catch (error) {
        console.error('Error fetching subscribers:', error);
        return res.status(500).json({
            success: false,
            error: 'تعذر جلب قائمة المشتركين',
            code: 'FETCH_FAILED'
        });
    }
}

/**
 * حذف مشترك من النشرة البريدية
 * DELETE /api/admin/newsletter-subscribers/:id
 */
async function deleteAdminSubscriber(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) {
            return res.status(400).json({ success: false, error: 'معرّف غير صالح' });
        }
        const success = await db.deleteNewsletterSubscriber(id);
        return res.json({ success });
    } catch (error) {
        console.error('Error deleting subscriber:', error);
        return res.status(500).json({ success: false, error: 'تعذر حذف المشترك' });
    }
}

module.exports = {
    subscribe,
    getAdminSubscribers,
    deleteAdminSubscriber
};
