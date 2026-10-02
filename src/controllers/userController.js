const db = require('../data/db-connection.js');
const { revokeAllUserSessions } = require('../utils/tokenUtils');

async function getProfile(req, res) {
    try {
        const user = await db.findUserById(req.userId);
        if (!user) return res.status(404).json({ message: 'المستخدم غير موجود', code: 'USER_NOT_FOUND' });

        const { password: _, ...userWithoutPass } = user;
        res.json(userWithoutPass);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'خطأ في جلب بيانات الملف الشخصي', code: 'PROFILE_FETCH_FAILED' });
    }
}

async function updateProfile(req, res) {
    try {
        const updatedUser = await db.updateUserProfile(req.userId, req.body);
        if (!updatedUser) return res.status(404).json({ message: 'المستخدم غير موجود', code: 'USER_NOT_FOUND' });

        if (req.body && req.body.password) {
            await revokeAllUserSessions(req.userId);
        }

        const { password: _, ...userWithoutPass } = updatedUser;
        res.json({ message: 'تم تحديث البيانات بنجاح', user: userWithoutPass });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(400).json({ message: error.message || 'خطأ في تحديث البيانات', code: 'PROFILE_UPDATE_FAILED' });
    }
}

async function addAddress(req, res) {
    try {
        const address = await db.addUserAddress(req.userId, req.body);
        res.status(201).json({ message: 'تمت إضافة العنوان بنجاح', address });
    } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({ message: 'خطأ في إضافة العنوان', code: 'ADDRESS_ADD_FAILED' });
    }
}

async function deleteAddress(req, res) {
    try {
        const success = await db.deleteUserAddress(req.userId, req.params.addressId);
        if (!success) return res.status(404).json({ message: 'العنوان غير موجود', code: 'ADDRESS_NOT_FOUND' });
        res.json({ message: 'تم حذف العنوان بنجاح' });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({ message: 'خطأ في حذف العنوان', code: 'ADDRESS_DELETE_FAILED' });
    }
}

module.exports = {
    getProfile,
    updateProfile,
    addAddress,
    deleteAddress
};
