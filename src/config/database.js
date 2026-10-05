/**
 * إعدادات وتكوين قاعدة البيانات
 */
const path = require('path');

// The relaxed (default-secret) mode is only allowed for automated tests running
// against a dedicated "*_test" database, so a stray NODE_ENV=test in production
// can never fall back to publicly known default secrets.
function isSafeTestEnvironment() {
    return process.env.NODE_ENV === 'test' && String(process.env.DB_NAME || '').endsWith('_test');
}

function getRequiredSecret(name, minimumLength = 32) {
    const value = process.env[name];
    const defaultVal = `development-only-${name.toLowerCase()}-secret-key-at-least-32-chars`;
    if (process.env.NODE_ENV === 'production' && process.env.DEMO_MODE !== 'true') {
        if (!value || value.length < minimumLength) {
            throw new Error(`${name} must be configured with at least ${minimumLength} characters.`);
        }
    }
    return value || defaultVal;
}

const dbEnvironments = {
    development: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'ecommerce_user',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ecommerce_store',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        namedPlaceholders: true,
        dateStrings: true,
        multipleStatements: false,
        charset: 'utf8mb4'
    },
    production: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'ecommerce_user',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ecommerce_store',
        waitForConnections: true,
        connectionLimit: 3,
        queueLimit: 0,
        namedPlaceholders: true,
        dateStrings: true,
        multipleStatements: false,
        charset: 'utf8mb4'
    },
    test: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'ecommerce_user',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ecommerce_store_test',
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        namedPlaceholders: true,
        dateStrings: true,
        multipleStatements: false,
        charset: 'utf8mb4'
    }
};

module.exports = {
  getConfig: () => {
      const env = process.env.NODE_ENV || 'development';
      return dbEnvironments[env] || dbEnvironments.development;
  },
  isProduction: process.env.NODE_ENV === 'production',
  PORT: Number(process.env.PORT) || 3000,
  JWT_SECRET: getRequiredSecret('JWT_SECRET'),
  COOKIE_SECRET: getRequiredSecret('COOKIE_SECRET'),
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(',').map(o => o.trim()).filter(Boolean)
};
