const db = require('../data/db-connection.js');
const chargilyService = require('../services/chargilyService');
const mailService = require('../services/mailService');
const { parseUserFromReq } = require('../utils/tokenUtils');
const { validateId } = require('../utils/helpers');

async function createChargilyCheckout(req, res) {
    try {
        const orderId = validateId(req.body.orderId);
        if (!orderId) {
            return res.status(400).json({ error: 'معرف الطلب غير صالح', message: 'معرف الطلب غير صالح', code: 'INVALID_ORDER_ID' });
        }

        const order = await db.getOrderById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'الطلب غير موجود', message: 'الطلب غير موجود', code: 'ORDER_NOT_FOUND' });
        }

        // Authorization check before creating payment checkout
        const authUserId = await parseUserFromReq(req);
        let isAuthorized = false;

        if (authUserId) {
            const user = await db.findUserById(authUserId);
            if (user && (user.role === 'admin' || Number(order.user_id) === Number(authUserId))) {
                isAuthorized = true;
            }
        }

        // Guest authorization via token or phone
        const token = req.body.token || req.headers['x-tracking-token'];
        const phone = req.body.phone;
        if (token && order.tracking_token === token) {
            isAuthorized = true;
        } else if (phone && order.phone && order.user_id === null) {
            const cleanReq = String(phone).replace(/[\s-]/g, '');
            const cleanOrder = String(order.phone).replace(/[\s-]/g, '');
            if (cleanReq && cleanReq === cleanOrder) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ error: 'غير مصرح لك بإنشاء جلسة دفع لهذا الطلب', message: 'غير مصرح لك بإنشاء جلسة دفع لهذا الطلب', code: 'PAYMENT_ACCESS_FORBIDDEN' });
        }

        const checkout = await chargilyService.createCheckout({
            orderId: order.id,
            orderNumber: order.order_number,
            amount: order.total,
            customerName: order.shipping_full_name,
            customerEmail: order.email,
            customerPhone: order.phone
        });

        res.json(checkout);
    } catch (error) {
        console.error('Error creating payment checkout:', error);
        res.status(500).json({ error: error.message || 'خطأ أثناء إنشاء جلسة الدفع', message: error.message || 'خطأ أثناء إنشاء جلسة الدفع', code: 'PAYMENT_CHECKOUT_FAILED' });
    }
}

async function handleChargilyWebhook(req, res) {
    try {
        const signature = req.headers['signature'] || '';
        const payloadToVerify = req.rawBody || req.body;

        const isValid = chargilyService.verifyWebhookSignature(payloadToVerify, signature);
        if (!isValid) {
            return res.status(403).json({ error: 'توقيع Webhook غير صالح', message: 'توقيع Webhook غير صالح', code: 'INVALID_WEBHOOK_SIGNATURE' });
        }

        const event = req.body;
        if (event && event.type === 'checkout.paid') {
            const checkoutData = event.data || {};
            const rawOrderId = checkoutData.metadata && checkoutData.metadata.order_id;
            const orderId = validateId(rawOrderId);

            if (orderId) {
                const order = await db.getOrderById(orderId);
                if (!order) {
                    return res.status(404).json({ error: 'الطلب المشار إليه غير موجود', message: 'الطلب المشار إليه غير موجود', code: 'ORDER_NOT_FOUND' });
                }

                // Mandatory check: Amount paid must strictly match order total
                const paidAmount = Number(checkoutData.amount);
                const expectedAmount = Math.round(Number(order.total));
                if (!paidAmount || paidAmount !== expectedAmount) {
                    console.error(`⚠️ Payment amount mismatch for order ${orderId}: paid=${paidAmount}, expected=${expectedAmount}`);
                    return res.status(400).json({ error: 'المبلغ المدفوع لا يطابق قيمة الطلب', message: 'المبلغ المدفوع لا يطابق قيمة الطلب', code: 'PAYMENT_AMOUNT_MISMATCH' });
                }

                // Idempotency: Do not process twice if already marked paid
                if (order.payment_status === 'paid') {
                    return res.json({ received: true, message: 'الطلب مدفوع مسبقاً' });
                }

                await db.updateOrderPaymentStatus(orderId, 'paid', 'chargily');
                await db.updateOrderStatus(orderId, 'processing');

                try {
                    mailService.sendOrderStatusUpdate(order, 'processing').catch(() => {});
                } catch (e) {}
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Chargily Webhook error:', error);
        res.status(500).json({ error: 'خطأ في معالجة إشعار الدفع', message: 'خطأ في معالجة إشعار الدفع', code: 'PAYMENT_WEBHOOK_FAILED' });
    }
}

module.exports = {
    createChargilyCheckout,
    handleChargilyWebhook
};
