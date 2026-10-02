const crypto = require('crypto');
const db = require('../data/db-connection.js');
const { parseUserFromReq } = require('../utils/tokenUtils');
const { validateId } = require('../utils/helpers');
const mailService = require('../services/mailService');
const telegramService = require('../services/telegramService');

async function createOrder(req, res) {
    try {
        const authUserId = await parseUserFromReq(req);
        const orderData = req.body || {};
        const requestedUserId = orderData.userId ? Number(orderData.userId) : null;

        if (!authUserId && requestedUserId) {
            return res.status(400).json({ error: 'يجب تسجيل الدخول لربط الطلب بحساب مستخدم', message: 'يجب تسجيل الدخول لربط الطلب بحساب مستخدم', code: 'LOGIN_REQUIRED_ORDER' });
        }

        if (authUserId && requestedUserId && authUserId !== requestedUserId) {
            return res.status(403).json({ error: 'لا يمكنك إنشاء طلب باسم مستخدم آخر', message: 'لا يمكنك إنشاء طلب باسم مستخدم آخر', code: 'CANNOT_ORDER_OTHER_USER' });
        }

        orderData.userId = authUserId || null;

        const result = await db.createOrder(orderData);
        const orderId = typeof result === 'object' ? result.id : result;
        const orderNumber = (typeof result === 'object' && result.orderNumber) || `DZ-${new Date().getFullYear()}-${orderId}`;
        const trackingToken = (typeof result === 'object' && result.trackingToken) || null;
        const finalTotal = (typeof result === 'object' && result.total) || null;

        // Post-order notification (async)
        try {
            const order = await db.getOrderById(orderId);
            const items = await db.getOrderItems(orderId);
            if (order) {
                mailService.sendOrderConfirmation(order, items).catch(e => console.error('Mail confirmation error:', e.message));
                mailService.notifyAdminNewOrder(order).catch(e => console.error('Mail admin notification error:', e.message));
                telegramService.notifyNewOrder(order, items).catch(e => console.error('Telegram notification error:', e.message));
            }
        } catch (mailErr) {
            console.error('Error in post-order notifications:', mailErr.message);
        }

        res.status(201).json({
            id: orderId,
            orderNumber,
            trackingToken,
            total: finalTotal,
            message: 'تم إنشاء الطلب بنجاح',
            code: 'ORDER_CREATED_SUCCESS'
        });
    } catch (error) {
        console.error('Error creating order:', error);
        if (error.message && error.message.includes('السلة فارغة')) {
            return res.status(400).json({ error: error.message, message: error.message, code: 'CART_EMPTY' });
        }
        if (error.message && (error.message.includes('المخزون') || error.message.includes('غير متوفرة'))) {
            return res.status(400).json({ error: error.message, message: error.message, code: 'OUT_OF_STOCK' });
        }
        res.status(400).json({ error: error.message || 'خطأ في إنشاء الطلب', message: error.message || 'خطأ في إنشاء الطلب', code: 'ORDER_CREATE_FAILED' });
    }
}

async function getOrders(req, res) {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: 'يجب تسجيل الدخول لعرض الطلبات', message: 'يجب تسجيل الدخول لعرض الطلبات', code: 'LOGIN_REQUIRED_VIEW_ORDERS' });
        }

        const user = await db.findUserById(userId);
        if (user && user.role === 'admin') {
            const allOrders = await db.getOrders();
            return res.json(allOrders);
        }

        const orders = await db.getOrders(userId);
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'خطأ في جلب الطلبات', message: 'خطأ في جلب الطلبات', code: 'ORDERS_FETCH_FAILED' });
    }
}

async function checkOrderAuthorization(req, order) {
    if (!order) return false;

    const authUserId = await parseUserFromReq(req);

    // 1. Registered Customer Order (order.user_id !== null)
    if (order.user_id !== null && order.user_id !== undefined) {
        if (!authUserId) return false;
        const user = await db.findUserById(authUserId);
        if (!user) return false;
        if (user.role === 'admin' || Number(order.user_id) === Number(authUserId)) {
            return true;
        }
        return false;
    }

    // 2. Guest Order (order.user_id === null)
    if (order.user_id === null) {
        // Admin authorization
        if (authUserId) {
            const user = await db.findUserById(authUserId);
            if (user && user.role === 'admin') {
                return true;
            }
        }

        // Tracking Token Verification (Header 'x-tracking-token', query 'token', or body 'token')
        const token = req.headers['x-tracking-token'] || (req.query && req.query.token) || (req.body && req.body.token);
        if (token && order.tracking_token) {
            const cleanToken = String(token).trim();
            const cleanOrderToken = String(order.tracking_token).trim();
            if (cleanToken.length === cleanOrderToken.length) {
                try {
                    const bufA = Buffer.from(cleanToken, 'utf8');
                    const bufB = Buffer.from(cleanOrderToken, 'utf8');
                    if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
                        return true;
                    }
                } catch (e) {}
            }
        }

        // Phone Verification removed per security requirements
        
        return false;
    }

    return false;
}

async function getOrderById(req, res) {
    try {
        const orderId = validateId(req.params.id);
        if (!orderId) {
            return res.status(400).json({ error: 'معرّف الطلب غير صالح', message: 'معرّف الطلب غير صالح', code: 'INVALID_ORDER_ID' });
        }

        const order = await db.getOrderById(orderId);
        if (!order) return res.status(404).json({ error: 'الطلب غير موجود', message: 'الطلب غير موجود', code: 'ORDER_NOT_FOUND' });

        const isAuthorized = await checkOrderAuthorization(req, order);
        if (!isAuthorized) {
            return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى بيانات هذا الطلب', message: 'غير مصرح لك بالوصول إلى بيانات هذا الطلب', code: 'ORDER_ACCESS_FORBIDDEN' });
        }

        const items = await db.getOrderItems(order.id);
        res.json({ ...order, items });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'خطأ في جلب الطلب', message: 'خطأ في جلب الطلب', code: 'ORDER_FETCH_FAILED' });
    }
}

async function getOrderItems(req, res) {
    try {
        const orderId = validateId(req.params.orderId);
        if (!orderId) {
            return res.status(400).json({ error: 'معرّف الطلب غير صالح', message: 'معرّف الطلب غير صالح', code: 'INVALID_ORDER_ID' });
        }

        const order = await db.getOrderById(orderId);
        if (!order) return res.status(404).json({ error: 'الطلب غير موجود', message: 'الطلب غير موجود', code: 'ORDER_NOT_FOUND' });

        const isAuthorized = await checkOrderAuthorization(req, order);
        if (!isAuthorized) {
            return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى عناصر هذا الطلب', message: 'غير مصرح لك بالوصول إلى عناصر هذا الطلب', code: 'ORDER_ACCESS_FORBIDDEN' });
        }

        const items = await db.getOrderItems(order.id);
        res.json(items);
    } catch (error) {
        console.error('Error fetching order items:', error);
        res.status(500).json({ error: 'خطأ في جلب عناصر الطلب', message: 'خطأ في جلب عناصر الطلب', code: 'ORDER_ITEMS_FETCH_FAILED' });
    }
}

async function trackOrder(req, res) {
    try {
        const { orderId, orderNumber, phone, token } = req.query;
        let searchId = orderId || orderNumber;

        if (searchId) {
            searchId = String(searchId).replace(/^#/, '').trim();
        }

        console.log('DEBUG_CONTROLLER:', { orderId, orderNumber, phone, token, searchId });

        if (!searchId || (!phone && !token)) {
            return res.status(400).json({ error: 'يرجى تقديم رقم الطلب ورقم الهاتف أو التوكن', message: 'يرجى تقديم رقم الطلب ورقم الهاتف أو التوكن', code: 'TRACKING_PARAMS_REQUIRED' });
        }

        let order = null;
        if (phone) {
            order = await db.getOrderByTracking(searchId, phone);
        } else if (token) {
            const raw = validateId(searchId) ? await db.getOrderById(searchId) : await db.getOrderByNumber(searchId);
            if (raw && raw.tracking_token === token) {
                order = raw;
            }
        }

        if (!order) {
            return res.status(404).json({ error: 'لم يتم العثور على طلب يطابق البيانات المدخلة', message: 'لم يتم العثور على طلب يطابق البيانات المدخلة', code: 'TRACKING_ORDER_NOT_FOUND' });
        }

        const items = await db.getOrderItems(order.id);
        res.json({
            order: {
                id: order.id,
                order_number: order.order_number,
                created_at: order.created_at,
                status: order.status,
                payment_method: order.payment_method,
                payment_status: order.payment_status,
                shipping_cost: order.shipping_cost,
                total: order.total
            },
            items
        });
    } catch (error) {
        console.error('Error tracking order:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تتبع الطلب', message: 'حدث خطأ أثناء تتبع الطلب', code: 'TRACKING_FAILED' });
    }
}

async function updateOrderStatus(req, res) {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'حالة الطلب غير صالحة', message: 'حالة الطلب غير صالحة', code: 'INVALID_ORDER_STATUS' });
        }

        const orderId = validateId(req.params.id);
        if (!orderId) {
            return res.status(400).json({ error: 'معرّف الطلب غير صالح', message: 'معرّف الطلب غير صالح', code: 'INVALID_ORDER_ID' });
        }

        const order = await db.getOrderById(orderId);
        if (!order) return res.status(404).json({ error: 'الطلب غير موجود', message: 'الطلب غير موجود', code: 'ORDER_NOT_FOUND' });

        const success = await db.updateOrderStatus(orderId, status);
        if (!success) return res.status(500).json({ error: 'فشل في تحديث حالة الطلب', message: 'فشل في تحديث حالة الطلب', code: 'ORDER_STATUS_UPDATE_FAILED' });

        // Notify customer via email
        try {
            mailService.sendOrderStatusUpdate(order, status).catch(e => console.error('Status mail error:', e.message));
        } catch (e) {}

        res.json({ message: 'تم تحديث حالة الطلب بنجاح', code: 'ORDER_STATUS_UPDATED', status });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'خطأ في تحديث حالة الطلب', message: 'خطأ في تحديث حالة الطلب', code: 'ORDER_STATUS_UPDATE_FAILED' });
    }
}

async function exportOrders(req, res) {
    try {
        const { status } = req.query;
        let orders = await db.getOrders();
        if (status && status !== 'all') {
            orders = orders.filter(o => o.status === status);
        }

        const headers = [
            'رقم الطلب',
            'اسم العميل',
            'رقم الهاتف',
            'البريد الإلكتروني',
            'الولاية',
            'العنوان / البلدية',
            'نوع التوصيل',
            'تكلفة الشحن (دج)',
            'المجموع الكلي (دج)',
            'طريقة الدفع',
            'حالة الدفع',
            'حالة الطلب',
            'تاريخ الطلب'
        ];

        // Neutralise spreadsheet formula injection: a cell starting with = + - @ (or TAB/CR)
        // would be executed by Excel/LibreOffice, so we prefix it with an apostrophe.
        const escapeCsv = (str) => {
            let clean = String(str === null || str === undefined ? '' : str);
            if (/^[=+\-@\t\r]/.test(clean)) clean = `'${clean}`;
            return `"${clean.replace(/"/g, '""')}"`;
        };

        const rows = orders.map(o => [
            escapeCsv(o.order_number || o.id),
            escapeCsv(o.shipping_full_name || 'عميل'),
            escapeCsv(o.phone || ''),
            escapeCsv(o.email || ''),
            escapeCsv(o.wilaya_name || ''),
            escapeCsv(o.address || o.city || ''),
            escapeCsv(o.delivery_type === 'desk' ? 'مكتب' : 'منزل'),
            escapeCsv(o.shipping_cost || 0),
            escapeCsv(o.total || 0),
            escapeCsv(o.payment_method === 'chargily' ? 'إلكتروني' : 'عند الاستلام'),
            escapeCsv(o.payment_status || 'pending'),
            escapeCsv(o.status || 'pending'),
            escapeCsv(new Date(o.created_at || Date.now()).toLocaleDateString('ar-DZ'))
        ].join(','));

        const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="orders-export-${Date.now()}.csv"`);
        res.status(200).send(csvContent);
    } catch (error) {
        console.error('Error exporting orders:', error);
        res.status(500).json({ error: 'خطأ في تصدير الطلبات', message: 'خطأ في تصدير الطلبات', code: 'ORDERS_EXPORT_FAILED' });
    }
}

async function deleteOrder(req, res) {
    try {
        const orderId = validateId(req.params.id);
        if (!orderId) {
            return res.status(400).json({ error: 'معرّف الطلب غير صالح', message: 'معرّف الطلب غير صالح', code: 'INVALID_ORDER_ID' });
        }

        const order = await db.getOrderById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'الطلب غير موجود', message: 'الطلب غير موجود', code: 'ORDER_NOT_FOUND' });
        }

        const success = await db.deleteOrder(orderId);
        if (!success) {
            return res.status(500).json({ error: 'فشل في حذف الطلب', message: 'فشل في حذف الطلب', code: 'ORDER_DELETE_FAILED' });
        }

        res.json({ message: 'تم حذف الطلب بنجاح', orderId });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: error.message || 'خطأ في حذف الطلب', message: error.message || 'خطأ في حذف الطلب', code: 'ORDER_DELETE_FAILED' });
    }
}

module.exports = {
    createOrder,
    getOrders,
    getOrderById,
    getOrderItems,
    trackOrder,
    updateOrderStatus,
    exportOrders,
    deleteOrder
};
