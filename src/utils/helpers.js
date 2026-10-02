/**
 * Input sanitization and validation helpers
 */

function sanitizeString(value, fallback = '', maxLength = 255) {
    if (typeof value !== 'string') return fallback;
    const clean = value.trim().slice(0, maxLength);
    return clean || fallback;
}

function parseNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function validateId(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    if (Number.isInteger(num) && num > 0 && num <= 2147483647) {
        return num;
    }
    return null;
}

function validatePositiveInteger(value, min = 1, max = 1000000) {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    if (Number.isInteger(num) && num >= min && num <= max) {
        return num;
    }
    return null;
}

function validatePrice(value, max = 100000000) {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    if (Number.isFinite(num) && num >= 0 && num <= max) {
        return num;
    }
    return null;
}

function validateEmail(email) {
    if (typeof email !== 'string') return null;
    const clean = email.trim().toLowerCase();
    if (clean.length > 255) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(clean) ? clean : null;
}

function validatePhone(phone) {
    if (typeof phone !== 'string') return null;
    const clean = phone.replace(/[\s-]/g, '').trim();
    if (/^(0[567][0-9]{8}|0[2-49][0-9]{7}|\+213[567][0-9]{8})$/.test(clean) || (clean.length >= 8 && clean.length <= 15 && /^[0-9+]+$/.test(clean))) {
        return clean;
    }
    return null;
}

module.exports = {
    sanitizeString,
    parseNumber,
    validateId,
    validatePositiveInteger,
    validatePrice,
    validateEmail,
    validatePhone
};
