process.env.NODE_ENV = 'test';
if (!process.env.DB_NAME || !process.env.DB_NAME.endsWith('_test')) {
    process.env.DB_NAME = (process.env.DB_NAME || 'ecommerce_store') + '_test';
}
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test';

const { test } = require('node:test');
const db = require('../src/data/db-connection');

// Guard: Refuse execution if database name does not end with _test
const dbConfig = require('../src/config/database');
const currentDbName = dbConfig.database || process.env.DB_NAME || '';
if (!currentDbName.endsWith('_test')) {
    throw new Error(`[SAFETY GUARD] Execution refused: Database "${currentDbName}" does not end with "_test". Automated tests must only execute against a dedicated test database (e.g. ecommerce_store_test).`);
}

let baselineOrderIds = [];

test.before(async () => {
    await db.initializeDatabase();
    if (db.pool && typeof db.pool.query === 'function') {
        try {
            const [rows] = await db.pool.query('SELECT id FROM orders');
            baselineOrderIds = Array.isArray(rows) ? rows.map(r => r.id) : [];
        } catch (_) {
            baselineOrderIds = [];
        }
    }
});

test.after(async () => {
    try {
        if (baselineOrderIds.length > 0 && db.pool && typeof db.pool.query === 'function') {
            const [newOrders] = await db.pool.query('SELECT id FROM orders WHERE id NOT IN (?)', [baselineOrderIds]);
            const idsToDelete = Array.isArray(newOrders) ? newOrders.map(o => o.id) : [];
            if (idsToDelete.length > 0) {
                await db.pool.query('DELETE FROM order_items WHERE order_id IN (?)', [idsToDelete]);
                await db.pool.query('DELETE FROM orders WHERE id IN (?)', [idsToDelete]);
            }
        }
    } catch (e) {}
    if (db && db.pool && typeof db.pool.end === 'function') {
        try { await db.pool.end(); } catch (_) {}
    }
});

/**
 * Master Test Suite - Runs all integration & remediation test suites
 */
require('./api.test.js');
require('./new_features.test.js');
require('./remediation.test.js');
require('./security.test.js');
require('./session_ttl.test.js');
require('./terms_privacy.test.js');
