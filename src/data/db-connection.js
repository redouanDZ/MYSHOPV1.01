require('dotenv').config();
const net = require('net');
const mysql = require('mysql2/promise');
const { createMysqlRepository, createFallbackRepository } = require('./repositories/mysql-repository');
const { createStoreService } = require('./services/store-service');

let serviceInstance = null;
let poolInstance = null;
let initPromise = null;
let memoryPoolProxy = null;

function getMemoryPool() {
    if (!memoryPoolProxy) {
        memoryPoolProxy = {
            async query() {
                return [[], []];
            },
            async execute() {
                return [[], []];
            },
            async end() {
                return true;
            }
        };
    }
    return memoryPoolProxy;
}

function isPortListening(host, port, timeoutMs = 600) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let settled = false;
        socket.setTimeout(timeoutMs);
        const onDone = (result) => {
            if (settled) return;
            settled = true;
            socket.destroy();
            resolve(result);
        };
        socket.once('connect', () => onDone(true));
        socket.once('timeout', () => onDone(false));
        socket.once('error', () => onDone(false));
        try {
            socket.connect(port, host);
        } catch (_) {
            onDone(false);
        }
    });
}

async function initializeDatabase() {
    if (serviceInstance) return serviceInstance;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        if (process.env.DEMO_MODE === 'true' || !process.env.DB_PASSWORD) {
            console.log('ℹ️ Running in standalone in-memory store repository mode');
            const repository = createFallbackRepository();
            serviceInstance = createStoreService(repository);
            return serviceInstance;
        }

        const dbConfig = require('../config/database.js').getConfig();
        const connectionConfig = {
            ...dbConfig,
            connectTimeout: 3000,
            charset: 'utf8mb4'
        };

        const host = connectionConfig.host || '127.0.0.1';
        const port = Number(connectionConfig.port) || 3306;

        // Quick probe: check if MySQL port is actively listening before creating pool
        const isListening = await isPortListening(host, port, 600);
        if (!isListening) {
            console.log(`ℹ️ MySQL server not detected at ${host}:${port}, using in-memory store repository.`);
            const repository = createFallbackRepository();
            serviceInstance = createStoreService(repository);
            return serviceInstance;
        }

        try {
            poolInstance = mysql.createPool(connectionConfig);
            const repository = createMysqlRepository(poolInstance);
            await repository.initializeSchema();
            serviceInstance = createStoreService(repository);
            return serviceInstance;
        } catch (error) {
            if (poolInstance) {
                try { await poolInstance.end(); } catch (_) {}
                poolInstance = null;
            }
            console.log(`ℹ️ MySQL initialization not completed (${error.message}), using in-memory repository.`);
            const repository = createFallbackRepository();
            serviceInstance = createStoreService(repository);
            return serviceInstance;
        }
    })();
    return initPromise;
}

function buildProxy(methodName) {
    return async (...args) => {
        const service = await initializeDatabase();
        return service[methodName](...args);
    };
}

module.exports = {
    initializeDatabase,
    get pool() {
        return poolInstance || getMemoryPool();
    },
    getProductById: buildProxy('getProductById'),
    getProducts: buildProxy('getProducts'),
    createProduct: buildProxy('createProduct'),
    updateProduct: buildProxy('updateProduct'),
    deleteProduct: buildProxy('deleteProduct'),
    addToCart: buildProxy('addToCart'),
    getCartItems: buildProxy('getCartItems'),
    updateCartItem: buildProxy('updateCartItem'),
    removeCartItem: buildProxy('removeCartItem'),
    createOrder: buildProxy('createOrder'),
    getOrderById: buildProxy('getOrderById'),
    getOrderByNumber: buildProxy('getOrderByNumber'),
    getOrderByTracking: buildProxy('getOrderByTracking'),
    updateOrderStatus: buildProxy('updateOrderStatus'),
    deleteOrder: buildProxy('deleteOrder'),
    updateOrderPaymentStatus: buildProxy('updateOrderPaymentStatus'),
    getOrderItems: buildProxy('getOrderItems'),
    getOrders: buildProxy('getOrders'),
    createUser: buildProxy('createUser'),
    verifyUserCredentials: buildProxy('verifyUserCredentials'),
    findUserByEmail: buildProxy('findUserByEmail'),
    findUserById: buildProxy('findUserById'),
    findUserByGoogleId: buildProxy('findUserByGoogleId'),
    linkGoogleId: buildProxy('linkGoogleId'),
    createUserFromGoogle: buildProxy('createUserFromGoogle'),
    updateUserVerificationToken: buildProxy('updateUserVerificationToken'),
    verifyUserEmail: buildProxy('verifyUserEmail'),
    findUserByVerificationToken: buildProxy('findUserByVerificationToken'),
    updatePasswordResetToken: buildProxy('updatePasswordResetToken'),
    findUserByResetToken: buildProxy('findUserByResetToken'),
    updateUserProfile: buildProxy('updateUserProfile'),
    addUserAddress: buildProxy('addUserAddress'),
    deleteUserAddress: buildProxy('deleteUserAddress'),
    getWilayas: buildProxy('getWilayas'),
    getWilayaById: buildProxy('getWilayaById'),
    updateWilayaPrice: buildProxy('updateWilayaPrice'),
    getAdminDashboardStats: buildProxy('getAdminDashboardStats'),
    addToWishlist: buildProxy('addToWishlist'),
    removeFromWishlist: buildProxy('removeFromWishlist'),
    getWishlist: buildProxy('getWishlist'),
    isInWishlist: buildProxy('isInWishlist'),
    createSession: buildProxy('createSession'),
    getSession: buildProxy('getSession'),
    touchSession: buildProxy('touchSession'),
    revokeSession: buildProxy('revokeSession'),
    getUserSessions: buildProxy('getUserSessions'),
    revokeAllUserSessions: buildProxy('revokeAllUserSessions'),
    getAdminUsers: buildProxy('getAdminUsers'),
    getAdminUserById: buildProxy('getAdminUserById'),
    getCoupons: buildProxy('getCoupons'),
    getCouponByCode: buildProxy('getCouponByCode'),
    createCoupon: buildProxy('createCoupon'),
    updateCoupon: buildProxy('updateCoupon'),
    deleteCoupon: buildProxy('deleteCoupon'),
    incrementCouponUsage: buildProxy('incrementCouponUsage'),
    getProductReviews: buildProxy('getProductReviews'),
    createProductReview: buildProxy('createProductReview'),
    getAdminReviews: buildProxy('getAdminReviews'),
    updateReviewStatus: buildProxy('updateReviewStatus'),
    deleteReview: buildProxy('deleteReview'),
    getStoreSettings: buildProxy('getStoreSettings'),
    updateStoreSettings: buildProxy('updateStoreSettings'),
    getProductVariants: buildProxy('getProductVariants'),
    createProductVariant: buildProxy('createProductVariant'),
    updateProductVariant: buildProxy('updateProductVariant'),
    deleteProductVariant: buildProxy('deleteProductVariant'),
    getCategories: buildProxy('getCategories'),
    getCategoryById: buildProxy('getCategoryById'),
    createCategory: buildProxy('createCategory'),
    updateCategory: buildProxy('updateCategory'),
    deleteCategory: buildProxy('deleteCategory'),
    updateUserRole: buildProxy('updateUserRole'),
    updateUserStatus: buildProxy('updateUserStatus'),
    deleteUser: buildProxy('deleteUser'),
    storeRefreshToken: buildProxy('storeRefreshToken'),
    getRefreshToken: buildProxy('getRefreshToken'),
    deleteRefreshToken: buildProxy('deleteRefreshToken'),
    revokeRefreshToken: buildProxy('revokeRefreshToken'),
    revokeAllUserRefreshTokens: buildProxy('revokeAllUserRefreshTokens'),
    getLoginAttempt: buildProxy('getLoginAttempt'),
    setLoginAttempt: buildProxy('setLoginAttempt'),
    clearLoginAttempt: buildProxy('clearLoginAttempt'),
    purgeExpiredSessionsAndTokens: buildProxy('purgeExpiredSessionsAndTokens')
};
