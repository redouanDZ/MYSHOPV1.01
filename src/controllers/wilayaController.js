const db = require('../data/db-connection.js');

async function getWilayas(req, res) {
    try {
        const wilayas = await db.getWilayas();
        res.json(wilayas);
    } catch (error) {
        console.error('Error fetching wilayas:', error);
        res.status(500).json({ error: 'خطأ في جلب قائمة الولايات', message: 'خطأ في جلب قائمة الولايات', code: 'WILAYAS_FETCH_FAILED' });
    }
}

async function getWilayaById(req, res) {
    try {
        const wilaya = await db.getWilayaById(req.params.id);
        if (!wilaya) return res.status(404).json({ error: 'الولاية غير موجودة', message: 'الولاية غير موجودة', code: 'WILAYA_NOT_FOUND' });
        res.json(wilaya);
    } catch (error) {
        console.error('Error fetching wilaya:', error);
        res.status(500).json({ error: 'خطأ في جلب بيانات الولاية', message: 'خطأ في جلب بيانات الولاية', code: 'WILAYA_FETCH_FAILED' });
    }
}

async function updateWilayaPrice(req, res) {
    try {
        const { home_delivery_price, desk_delivery_price, delivery_time_days, is_active } = req.body;
        const success = await db.updateWilayaPrice(req.params.id, {
            home_delivery_price,
            desk_delivery_price,
            delivery_time_days,
            is_active
        });

        if (!success) return res.status(404).json({ error: 'الولاية غير موجودة', message: 'الولاية غير موجودة', code: 'WILAYA_NOT_FOUND' });
        res.json({ message: 'تم تحديث أسعار التوصيل للولاية بنجاح' });
    } catch (error) {
        console.error('Error updating wilaya price:', error);
        res.status(500).json({ error: 'خطأ في تحديث تسعير الولاية', message: 'خطأ في تحديث تسعير الولاية', code: 'WILAYA_UPDATE_FAILED' });
    }
}

module.exports = {
    getWilayas,
    getWilayaById,
    updateWilayaPrice
};
