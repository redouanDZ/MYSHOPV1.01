const db = require('../data/db-connection.js');

async function validateCoupon(req, res) {
    try {
        const code = String(req.body.code || '').trim().toUpperCase();
        const orderAmount = Number(req.body.orderAmount || req.body.orderTotal || req.body.total || 0);

        if (!code) {
            return res.status(400).json({ valid: false, error: 'يرجى إدخال رمز قسيمة الخصم', message: 'يرجى إدخال رمز قسيمة الخصم', code: 'COUPON_CODE_REQUIRED' });
        }

        const coupon = await db.getCouponByCode(code);
        if (!coupon) {
            return res.status(404).json({ valid: false, error: 'رمز قسيمة الخصم غير موجود أو غير صالح', message: 'رمز قسيمة الخصم غير موجود أو غير صالح', code: 'COUPON_INVALID' });
        }

        if (coupon.status !== 'active') {
            return res.status(400).json({ valid: false, error: 'هذه القسيمة غير نشطة حالياً', message: 'هذه القسيمة غير نشطة حالياً', code: 'COUPON_INACTIVE' });
        }

        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            return res.status(400).json({ valid: false, error: 'انتهت صلاحية قسيمة الخصم هذه', message: 'انتهت صلاحية قسيمة الخصم هذه', code: 'COUPON_EXPIRED' });
        }

        if (coupon.max_uses > 0 && coupon.uses_count >= coupon.max_uses) {
            return res.status(400).json({ valid: false, error: 'تم استنفاد الحد الأقصى لاستخدام هذه القسيمة', message: 'تم استنفاد الحد الأقصى لاستخدام هذه القسيمة', code: 'COUPON_MAX_USES_REACHED' });
        }

        if (coupon.min_order_amount > 0 && orderAmount < coupon.min_order_amount) {
            const minMsg = `الحد الأدنى لقيمة الطلب لتطبيق هذا الكوبون هو ${coupon.min_order_amount.toLocaleString()} دج`;
            return res.status(400).json({
                valid: false,
                error: minMsg,
                message: minMsg,
                code: 'COUPON_MIN_ORDER_REQUIRED'
            });
        }

        let calculatedDiscount = 0;
        if (coupon.discount_percent > 0) {
            calculatedDiscount = Math.round((orderAmount * coupon.discount_percent) / 100);
        } else if (coupon.discount_amount > 0) {
            calculatedDiscount = Math.min(orderAmount, Math.round(coupon.discount_amount));
        }

        res.json({
            valid: true,
            code: coupon.code,
            resultCode: 'COUPON_APPLIED',
            discountPercent: coupon.discount_percent,
            discountAmount: coupon.discount_amount,
            calculatedDiscount,
            minOrderAmount: coupon.min_order_amount,
            message: 'تم تطبيق قسيمة الخصم بنجاح! 🎉'
        });
    } catch (error) {
        console.error('Error validating coupon:', error);
        res.status(500).json({ valid: false, error: 'خطأ أثناء التحقق من قسيمة الخصم', message: 'خطأ أثناء التحقق من قسيمة الخصم', code: 'COUPON_CHECK_ERROR' });
    }
}

module.exports = {
    validateCoupon
};
