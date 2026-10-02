const db = require('../data/db-connection.js');
const { parseUserFromReq } = require('../utils/tokenUtils');

async function requireAdmin(req, res, next) {
    try {
        const userId = await parseUserFromReq(req);
        if (!userId) {
            return res.status(401).json({ message: 'غير مصرح لك، يرجى تسجيل الدخول' });
        }

        const user = await db.findUserById(userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'هذه العملية متاحة فقط للمسؤولين' });
        }
        req.userId = userId;
        next();
    } catch (error) {
        console.error('Admin authorization error:', error);
        return res.status(500).json({ message: 'خطأ في التحقق من صلاحيات المسؤول' });
    }
}

module.exports = {
    requireAdmin
};
