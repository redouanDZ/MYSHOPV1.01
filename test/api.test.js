const { describe } = require('node:test');

describe('API Integration Suite', () => {
const test = require('node:test');
const assert = require('node:assert');
const db = require('../src/data/db-connection.js');

let testUser;
let baselineOrders = [];

test.before(async () => {
    await db.initializeDatabase();
    if (db.pool && typeof db.pool.query === 'function') {
        const [rows] = await db.pool.query('SELECT id FROM orders');
        baselineOrders = rows.map(r => r.id);
    }
    testUser = await db.findUserByEmail('user@example.com');
    if (!testUser) {
        await db.createUser({
            username: 'مستخدم تجريبي',
            email: 'user@example.com',
            phone: '0550000000',
            password: 'password123',
            role: 'customer'
        });
        testUser = await db.findUserByEmail('user@example.com');
    }
    
    // Ensure test product (id: 1) exists for tests
    if (db.pool && typeof db.pool.query === 'function') {
        const [cats] = await db.pool.query('SELECT id FROM categories WHERE id = 1');
        if (cats.length === 0) {
            await db.pool.query('INSERT IGNORE INTO categories (id, name, slug) VALUES (1, "Test Category", "test-cat")');
        }
        const [prods] = await db.pool.query('SELECT id FROM products WHERE id = 1');
        if (prods.length === 0) {
            await db.pool.query('INSERT IGNORE INTO products (id, category_id, name, price, stock, status) VALUES (1, 1, "Test Product", 125000, 100, "active")');
        } else {
            await db.pool.query('UPDATE products SET stock = 100 WHERE id = 1');
        }
    }
});

test('Product Search and Filters Logic Test', async () => {
    
    // 1. Search term
    const searchRes = await db.getProducts({ search: 'حاسوب' });
    assert.ok(searchRes.products, 'Result should have products array');
    assert.strictEqual(Array.isArray(searchRes.products), true);
    assert.ok(searchRes.products.length > 0, 'Should find product with search term');

    // 2. Price filter
    const priceRes = await db.getProducts({ minPrice: 10000, maxPrice: 30000 });
    assert.ok(Array.isArray(priceRes.products), 'Price filter should return array');
    priceRes.products.forEach(p => {
        assert.ok(p.price >= 10000 && p.price <= 30000, `Product price ${p.price} should be within [10000, 30000]`);
    });

    // 3. Rating filter
    const ratingRes = await db.getProducts({ minRating: 4.7 });
    assert.ok(Array.isArray(ratingRes.products), 'Rating filter should return array');
    ratingRes.products.forEach(p => {
        assert.ok(Number(p.rating) >= 4.7, `Product rating ${p.rating} should be >= 4.7`);
    });

    // 4. In-Stock filter
    const stockRes = await db.getProducts({ inStock: true });
    assert.ok(Array.isArray(stockRes.products), 'In-stock filter should return array');
    stockRes.products.forEach(p => {
        assert.ok(p.stock > 0, `Product stock ${p.stock} should be > 0`);
    });

    // 5. Sorting by price asc
    const sortRes = await db.getProducts({ sortBy: 'price-asc' });
    assert.ok(sortRes.products.length >= 2, 'Should have multiple products to test sorting');
    for (let i = 0; i < sortRes.products.length - 1; i++) {
        assert.ok(sortRes.products[i].price <= sortRes.products[i + 1].price, 'Products should be sorted by price ascending');
    }
});

test('User Database Credentials Verification Test', async () => {
    const db = require('../src/data/db-connection.js');
    const user = await db.verifyUserCredentials('user@example.com', 'password123');
    assert.ok(user, 'User should be authenticated successfully');
    assert.strictEqual(user.email, 'user@example.com');
});

test('Cart Calculation and Order Placement Test', async () => {
    const db = require('../src/data/db-connection.js');
    const productsRes = await db.getProducts({ limit: 1 });
    const product = (productsRes.products && productsRes.products[0]) || { id: 1, price: 125000, name: 'Test Product' };
    const orderRes = await db.createOrder({
        userId: testUser.id,
        total: Number(product.price),
        cart: [{ id: product.id, name: product.name, price: Number(product.price), quantity: 1 }]
    });
    const orderId = typeof orderRes === 'object' ? orderRes.id : orderRes;
    assert.ok(orderId, 'Order ID should be returned');
    const order = await db.getOrderById(orderId);
    assert.ok(order, 'Order should exist in database');
    assert.strictEqual(Number(order.total), Number(product.price) + Number(order.shipping_cost));
});

test('Authentication Bypass Prevention Test', async () => {
    const { parseUserFromReq } = require('../src/utils/tokenUtils.js');
    const mockReq = {
        headers: {
            cookie: 'access_token=token_user_1'
        }
    };
    const userId = await parseUserFromReq(mockReq);
    assert.strictEqual(userId, null, 'Legacy token_user_ pattern must be rejected and return null');
});

test('Session Lifecycle and Strict Revocation Security Test', async () => {
    const jwt = require('jsonwebtoken');
    const config = require('../src/config/database');
    const {
        issueSession,
        revokeSession,
        createAccessToken,
        parseUserFromReq,
        activeSessions
    } = require('../src/utils/tokenUtils.js');

    // 1. Issue a valid session and token
    const sessionId = await issueSession(
        { id: testUser.id, email: testUser.email, role: 'customer' },
        { headers: { 'user-agent': 'TestRunner/1.0' }, ip: '127.0.0.1' }
    );
    assert.ok(sessionId, 'Session ID must be issued');
    const token = createAccessToken({ id: testUser.id, email: testUser.email, role: 'customer' }, sessionId);

    // 2. Validate session works
    const userId = await parseUserFromReq({ headers: { authorization: `Bearer ${token}` } });
    assert.strictEqual(userId, testUser.id, 'Valid session should return user ID');

    // 3. Simulate server restart / in-memory cache wipe
    activeSessions.clear();
    const userAfterRestart = await parseUserFromReq({ headers: { authorization: `Bearer ${token}` } });
    assert.strictEqual(userAfterRestart, testUser.id, 'Valid session should persist and survive in-memory cache wipe via DB');

    // 4. Test valid JWT signature with non-existent session ID
    const fakeToken = jwt.sign(
        { id: testUser.id, email: testUser.email, role: 'customer', sessionId: 'fake_non_existent_session_123', type: 'access' },
        config.JWT_SECRET,
        { expiresIn: '15m' }
    );
    const fakeResult = await parseUserFromReq({ headers: { authorization: `Bearer ${fakeToken}` } });
    assert.strictEqual(fakeResult, null, 'Valid JWT signature with non-existent session MUST be strictly rejected');

    // 5. Revoke session (e.g. logout) and test rejection
    await revokeSession(sessionId);
    const revokedResult = await parseUserFromReq({ headers: { authorization: `Bearer ${token}` } });
    assert.strictEqual(revokedResult, null, 'Revoked session MUST be strictly rejected');

    // 6. Test revoked session survives cache wipe and remains rejected in DB
    activeSessions.clear();
    const revokedAfterRestart = await parseUserFromReq({ headers: { authorization: `Bearer ${token}` } });
    assert.strictEqual(revokedAfterRestart, null, 'Revoked session in DB MUST remain strictly rejected after restart');
});

test('Guest Checkout with COD and Wilaya Test', async () => {
    const db = require('../src/data/db-connection.js');
    const guestPhone = '0555123456';
    const prodRes = await db.getProducts({ inStock: true });
    const product = (prodRes.products && prodRes.products[0]) || { id: 1, price: 18500, name: 'منتج تجريبي' };
    const orderRes = await db.createOrder({
        userId: null,
        paymentMethod: 'cod',
        total: Number(product.price),
        shippingInfo: {
            fullName: 'عميل زائر',
            phone: guestPhone,
            email: 'guest@example.com',
            address: 'شارع الاستقلال 45',
            city: 'وهران',
            wilayaId: 31,
            wilayaName: 'وهران',
            deliveryType: 'home',
            shippingCost: 550
        },
        cart: [{ id: product.id, name: product.name, price: Number(product.price), quantity: 1 }]
    });

    const orderId = typeof orderRes === 'object' ? orderRes.id : orderRes;
    assert.ok(orderId, 'Guest Order ID should be returned');
    
    const order = await db.getOrderById(orderId);
    assert.ok(order, 'Guest order must exist');
    assert.strictEqual(order.payment_method, 'cod');
    assert.strictEqual(order.phone, guestPhone);

    // Track order as guest
    const tracked = await db.getOrderByTracking(orderId, guestPhone);
    assert.ok(tracked, 'Guest must be able to track their order using ID and phone number');
    assert.strictEqual(tracked.id, orderId);
});

test('Stock Over-ordering Protection Test', async () => {
    const db = require('../src/data/db-connection.js');
    if (db.pool && typeof db.pool.query === 'function') {
        await db.pool.query('UPDATE products SET stock = 10 WHERE id = 1');
    }
    let threwError = false;
    try {
        await db.createOrder({
            userId: null,
            total: 999999,
            cart: [{ id: 1, name: 'حاسوب محمول', price: 125000, quantity: 50 }]
        });
    } catch (err) {
        threwError = true;
        assert.ok(err.message.includes('غير متوفرة') || err.message.includes('غير صالحة'), 'Should indicate stock shortage or invalid quantity');
    }
    assert.strictEqual(threwError, true, 'Ordering more than available stock must be rejected');
});

test('Algerian 58 Wilayas Retrieval Test', async () => {
    const db = require('../src/data/db-connection.js');
    const wilayas = await db.getWilayas();
    assert.ok(Array.isArray(wilayas), 'Wilayas must be an array');
    assert.strictEqual(wilayas.length >= 58, true, 'Must contain all 58 Algerian wilayas');
    
    const algiers = wilayas.find(w => w.code === '16' || w.name_ar.includes('الجزائر'));
    assert.ok(algiers, 'Algiers (Wilaya 16) must exist with delivery price');
    assert.ok(algiers.home_delivery_price > 0, 'Home delivery price must be defined');
});

test('Wishlist Add, Check, List and Remove Test', async () => {
    const db = require('../src/data/db-connection.js');
    const userId = testUser.id;
    const productId = 1;

    // Add to wishlist
    const added = await db.addToWishlist(userId, productId);
    assert.strictEqual(added, true, 'Product should be added to wishlist');

    // Check status
    const inWishlist = await db.isInWishlist(userId, productId);
    assert.strictEqual(inWishlist, true, 'Product should be confirmed in wishlist');

    // Get wishlist items
    const list = await db.getWishlist(userId);
    assert.ok(Array.isArray(list), 'Wishlist items must be returned as array');
    assert.ok(list.some(p => p.id === productId), 'Added product should be present in wishlist array');

    // Remove from wishlist
    const removed = await db.removeFromWishlist(userId, productId);
    assert.strictEqual(removed, true, 'Product should be removed from wishlist');

    // Verify removal
    const stillInWishlist = await db.isInWishlist(userId, productId);
    assert.strictEqual(stillInWishlist, false, 'Product should no longer be in wishlist');
});

test('Multi-language AR/FR/EN Localization Files Test', async () => {
    const fs = require('fs');
    const path = require('path');

    const localesDir = path.join(__dirname, '..', 'locales');
    const arPath = path.join(localesDir, 'ar.json');
    const frPath = path.join(localesDir, 'fr.json');
    const enPath = path.join(localesDir, 'en.json');

    assert.ok(fs.existsSync(arPath), 'ar.json must exist');
    assert.ok(fs.existsSync(frPath), 'fr.json must exist');
    assert.ok(fs.existsSync(enPath), 'en.json must exist');

    const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
    const fr = JSON.parse(fs.readFileSync(frPath, 'utf8'));
    const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

    assert.strictEqual(ar.dir, 'rtl', 'Arabic must be RTL');
    assert.strictEqual(fr.dir, 'ltr', 'French must be LTR');
    assert.strictEqual(en.dir, 'ltr', 'English must be LTR');

    assert.ok(ar.nav && ar.common && ar.cart && ar.checkout, 'Arabic dictionary must have core sections');
    assert.ok(fr.nav && fr.common && fr.cart && fr.checkout, 'French dictionary must have core sections');
    assert.ok(en.nav && en.common && en.cart && en.checkout, 'English dictionary must have core sections');
});

test('Order Confirmation and Cart Access with Async Auth Test', async () => {
    const app = require('../src/app');
    const http = require('http');
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
        const db = require('../src/data/db-connection.js');
        const prodRes = await db.getProducts({ inStock: true });
        const product = (prodRes.products && prodRes.products[0]) || { id: 1, name: 'حاسوب محمول', price: 25000 };
        if (db.pool && typeof db.pool.query === 'function') {
            await db.pool.query('UPDATE products SET stock = 100 WHERE id = ?', [product.id]);
        }

        // 1. Create guest order
        const guestOrderRes = await fetch(`${baseUrl}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                paymentMethod: 'cod',
                total: Number(product.price),
                shippingInfo: {
                    fullName: 'ضيف تجريبي',
                    phone: '0551112233',
                    city: 'الجزائر'
                },
                cart: [{ id: product.id, name: product.name, price: Number(product.price), quantity: 1 }]
            })
        });
        const guestOrderData = await guestOrderRes.json();
        assert.strictEqual(guestOrderRes.status, 201, 'Guest order should be created');
        assert.ok(guestOrderData.id, 'Order ID must be returned');

        // 2. Fetch guest order via GET /api/orders/:id with tracking token (simulating order confirmation page)
        const fetchOrderRes = await fetch(`${baseUrl}/api/orders/${guestOrderData.id}?token=${guestOrderData.trackingToken}`);
        const fetchOrderData = await fetchOrderRes.json();
        assert.strictEqual(fetchOrderRes.status, 200, 'Order confirmation page must successfully retrieve guest order using token');
        assert.strictEqual(Number(fetchOrderData.id), Number(guestOrderData.id));

        // 3. Cart operations with authentication
        const { issueSession, createAccessToken } = require('../src/utils/tokenUtils');
        const user = await db.findUserByEmail('user@example.com') || { id: 1, email: 'user@example.com', role: 'customer' };
        const session = await issueSession(user, { headers: {}, ip: '127.0.0.1' });
        const token = createAccessToken(user, session);

        const addCartRes = await fetch(`${baseUrl}/api/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId: 1, quantity: 2 })
        });
        assert.strictEqual(addCartRes.status, 201, 'Authenticated user should be able to add to cart');

        const getCartRes = await fetch(`${baseUrl}/api/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        assert.strictEqual(getCartRes.status, 200, 'Authenticated user should be able to get cart');
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});

test.after(async () => {
    try {
        if (db.pool && typeof db.pool.query === 'function') {
            if (baselineOrders.length > 0) {
                const [newOrders] = await db.pool.query('SELECT id FROM orders WHERE id NOT IN (?)', [baselineOrders]);
                const ids = newOrders.map(o => o.id);
                if (ids.length > 0) {
                    await db.pool.query('DELETE FROM order_items WHERE order_id IN (?)', [ids]);
                    await db.pool.query('DELETE FROM orders WHERE id IN (?)', [ids]);
                }
            } else {
                const [allOrders] = await db.pool.query('SELECT id FROM orders');
                const ids = allOrders.map(o => o.id);
                if (ids.length > 0) {
                    await db.pool.query('DELETE FROM order_items WHERE order_id IN (?)', [ids]);
                    await db.pool.query('DELETE FROM orders WHERE id IN (?)', [ids]);
                }
            }
        }
    } catch (e) {}
});

});
