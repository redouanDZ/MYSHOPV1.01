function errorHandler(err, req, res, next) {
    if (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'حجم الطلب أو الملف كبير جداً', message: 'حجم الطلب أو الملف كبير جداً' });
    }

    if (err.code === 'INVALID_FILE_TYPE' || (err.message && (err.message.includes('image') || err.message.includes('امتداد الملف')))) {
        return res.status(400).json({ error: 'يسمح فقط برفع ملفات الصور المعتمدة (JPG, PNG, WEBP, GIF)', message: 'يسمح فقط برفع ملفات الصور المعتمدة (JPG, PNG, WEBP, GIF)' });
    }

    console.error('Unhandled Error:', err.stack || err.message || err);

    res.status(500).json({
        error: 'حدث خطأ داخلي في الخادم',
        message: 'حدث خطأ داخلي في الخادم',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
}

function notFoundHandler(req, res, next) {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: 'المسار غير موجود' });
    }
    res.status(404).sendFile('index.html', { root: './' });
}

module.exports = {
    errorHandler,
    notFoundHandler
};
