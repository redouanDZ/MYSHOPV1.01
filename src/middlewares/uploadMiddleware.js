const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, '../../images'));
    },
    filename: function(req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            const err = new Error('امتداد الملف غير مسموح');
            err.code = 'INVALID_FILE_TYPE';
            return cb(err);
        }
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        if (!file || !file.originalname || !file.mimetype) {
            const err = new Error('Only image files are allowed.');
            err.code = 'INVALID_FILE_TYPE';
            return cb(err, false);
        }

        const ext = path.extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIMETYPES.includes(file.mimetype.toLowerCase())) {
            const err = new Error('Only image files are allowed. Allowed extensions: JPG, PNG, WEBP, GIF');
            err.code = 'INVALID_FILE_TYPE';
            return cb(err, false);
        }

        cb(null, true);
    }
});

/**
 * Verify Magic Bytes (File Signatures) for uploaded image files
 */
async function verifyMagicBytes(filePath) {
    let fileHandle;
    try {
        fileHandle = await fs.promises.open(filePath, 'r');
        const buffer = Buffer.alloc(16);
        const { bytesRead } = await fileHandle.read(buffer, 0, 16, 0);

        if (bytesRead < 4) {
            return null;
        }

        // JPEG: FF D8 FF
        if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
            return 'jpeg';
        }

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (bytesRead >= 8 &&
            buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
            buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
            return 'png';
        }

        // GIF: 47 49 46 38 ('GIF8')
        if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
            return 'gif';
        }

        // WebP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
        if (bytesRead >= 12 &&
            buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
            buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
            return 'webp';
        }

        return null;
    } catch (err) {
        console.error('Error verifying magic bytes:', err);
        return null;
    } finally {
        if (fileHandle) {
            await fileHandle.close().catch(() => {});
        }
    }
}

/**
 * Express middleware to validate that the uploaded file contains valid image magic bytes
 */
async function validateUploadedImage(req, res, next) {
    if (!req.file) {
        return next();
    }

    const detectedType = await verifyMagicBytes(req.file.path);
    if (!detectedType) {
        // Unlink invalid / forged file immediately
        await fs.promises.unlink(req.file.path).catch(() => {});
        delete req.file;
        return res.status(400).json({ error: 'محتوى الملف غير صالح أو لا يطابق نوع صورة معتمد' });
    }

    const ext = path.extname(req.file.filename).toLowerCase();
    const extMatch = (
        (detectedType === 'jpeg' && (ext === '.jpg' || ext === '.jpeg')) ||
        (detectedType === 'png' && ext === '.png') ||
        (detectedType === 'gif' && ext === '.gif') ||
        (detectedType === 'webp' && ext === '.webp')
    );

    if (!extMatch) {
        await fs.promises.unlink(req.file.path).catch(() => {});
        delete req.file;
        return res.status(400).json({ error: 'امتداد الملف لا يطابق محتواه الفعلي' });
    }

    // Convert to WebP and resize to max-width 1000px using sharp.
    // If sharp is available but cannot decode the file, the upload is rejected (400)
    // instead of publishing an unprocessed/unverified file.
    let sharp = null;
    try {
        sharp = require('sharp');
    } catch (loadError) {
        console.error('Sharp is not available, keeping original image:', loadError.message);
    }

    if (sharp) {
        const originalPath = req.file.path;
        const parsed = path.parse(originalPath);
        const webpFilename = `${parsed.name}.webp`;
        const webpPath = path.join(parsed.dir, webpFilename);

        try {
            await sharp(originalPath)
                .resize({ width: 1000, withoutEnlargement: true })
                .webp({ quality: 82 })
                .toFile(webpPath);
        } catch (sharpError) {
            console.error('Image processing failed, upload rejected:', sharpError.message);
            await fs.promises.unlink(originalPath).catch(() => {});
            await fs.promises.unlink(webpPath).catch(() => {});
            delete req.file;
            return res.status(400).json({
                error: 'تعذّرت معالجة الصورة، يرجى رفع صورة صالحة',
                code: 'INVALID_IMAGE'
            });
        }

        if (originalPath !== webpPath) {
            await fs.promises.unlink(originalPath).catch(() => {});
        }

        req.file.path = webpPath;
        req.file.filename = webpFilename;
        req.file.mimetype = 'image/webp';
    }

    try {
        const { processUploadedFile } = require('../utils/cloudStorage');
        await processUploadedFile(req.file);
    } catch (err) {
        console.error('Error in cloud storage processor:', err);
    }

    next();
}

module.exports = upload;
module.exports.upload = upload;
module.exports.validateUploadedImage = validateUploadedImage;
module.exports.verifyMagicBytes = verifyMagicBytes;
module.exports.ALLOWED_EXTENSIONS = ALLOWED_EXTENSIONS;
module.exports.ALLOWED_MIMETYPES = ALLOWED_MIMETYPES;
