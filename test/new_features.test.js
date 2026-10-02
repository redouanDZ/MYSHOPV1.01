const { describe, test } = require('node:test');
const assert = require('node:assert');
const telegramService = require('../src/services/telegramService');
const db = require('../src/data/db-connection');

describe('New Features Suite: Telegram & Cost/Profit Margin Tracking', () => {
    test.before(async () => {
        await db.initializeDatabase();
    });

    test('Telegram Service handles missing token/chatId gracefully', async () => {
        const result = await telegramService.sendMessage(null, null, 'Test');
        assert.strictEqual(result.success, false);
        assert.ok(result.error);
    });

    test('Telegram Service test alert returns expected structure', async () => {
        // Mocking / validating invalid token rejection from Telegram API
        const result = await telegramService.sendTestAlert('invalid_token', '123456');
        assert.strictEqual(result.success, false);
        assert.ok(result.error.length > 0);
    });

    test('Products Cost Price persistence in CRUD lifecycle', async () => {
        const createdId = await db.createProduct({
            name: 'منتج اختبار التكلفة',
            category: 'إلكترونيات',
            price: 5000,
            cost_price: 3200,
            stock: 25,
            description: 'وصف تجريبي لفحص سعر الشراء والتكلفة'
        });
        assert.ok(createdId > 0, 'Product should be created');

        const product = await db.getProductById(createdId);
        assert.ok(product);
        assert.strictEqual(Number(product.cost_price), 3200, 'Cost price should be persisted');
        assert.strictEqual(Number(product.price), 5000);

        // Update cost price
        const updated = await db.updateProduct(createdId, { cost_price: 3500 });
        assert.strictEqual(updated, true);

        const updatedProd = await db.getProductById(createdId);
        assert.strictEqual(Number(updatedProd.cost_price), 3500);

        // Cleanup
        await db.deleteProduct(createdId);
    });

    test('Admin Dashboard Stats includes netProfit and totalCost metrics', async () => {
        const stats = await db.getAdminDashboardStats();
        assert.ok(stats);
        assert.ok(typeof stats.totalRevenue === 'number', 'totalRevenue must be a number');
        assert.ok(typeof stats.netProfit === 'number', 'netProfit must be a number');
        assert.ok(typeof stats.totalCost === 'number', 'totalCost must be a number');
        assert.ok(stats.netProfit <= stats.totalRevenue, 'netProfit cannot exceed total revenue');
    });
});
