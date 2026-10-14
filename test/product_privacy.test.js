const { describe, test } = require('node:test');
const assert = require('node:assert');
const db = require('../src/data/db-connection');
const productController = require('../src/controllers/productController');

function mockRes() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; }
    };
}
// anonymous visitor: no cookies, no Authorization header
const visitor = (extra = {}) => ({ query: {}, params: {}, headers: {}, cookies: {}, ...extra });

describe('Public product endpoints do not leak private data', () => {
    let draftId;

    test.before(async () => {
        await db.initializeDatabase();
        const created = await db.createProduct({
            name: 'Privacy test draft', category: 'إلكترونيات', price: 999, cost_price: 500, stock: 5,
            status: 'draft', description: 'hidden'
        });
        draftId = typeof created === 'object' ? (created.id || created.insertId) : created;
    });

    test('cost_price is never in the public list, detail or recommendations', async () => {
        const list = mockRes();
        await productController.getProducts(visitor(), list);
        assert.ok(list.body.products.length > 0);
        for (const p of list.body.products) {
            assert.ok(!('cost_price' in p) && !('costPrice' in p), `cost leaked on product ${p.id}`);
        }

        const one = mockRes();
        await productController.getProductById(visitor({ params: { id: list.body.products[0].id } }), one);
        assert.strictEqual(one.statusCode, 200);
        assert.ok(!('cost_price' in one.body) && !('costPrice' in one.body));

        const rec = mockRes();
        await productController.recommendations(visitor({ query: { productId: '1' } }), rec);
        for (const p of rec.body) assert.ok(!('cost_price' in p) && !('costPrice' in p));
    });

    test('draft products are invisible to visitors, even with ?status=draft or ?status=all', async () => {
        for (const status of [undefined, 'draft', 'all', 'inactive']) {
            const res = mockRes();
            await productController.getProducts(visitor({ query: status ? { status } : {} }), res);
            const leaked = res.body.products.filter(p => Number(p.id) === Number(draftId));
            assert.strictEqual(leaked.length, 0, `draft visible with status=${status}`);
            for (const p of res.body.products) assert.strictEqual(p.status, 'active');
        }
    });

    test('a draft product answers 404 when requested directly by id', async () => {
        const res = mockRes();
        await productController.getProductById(visitor({ params: { id: draftId } }), res);
        assert.strictEqual(res.statusCode, 404);
    });
});
