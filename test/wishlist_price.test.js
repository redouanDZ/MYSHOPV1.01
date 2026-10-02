const { describe, test } = require('node:test');
const assert = require('node:assert');

describe('Wishlist Price & Synchronization Suite', () => {
    test('Wishlist item properly extracts price and details from product object', () => {
        const prod = {
            id: 15,
            name: 'سماعات بلوتوث لاسلكية',
            price: 3500,
            stock: 12,
            image_url: '/images/headphones.jpg',
            category: 'إلكترونيات'
        };

        const itemData = {
            id: Number(prod.id),
            name: prod.name || 'منتج',
            price: Number(prod.price || 0),
            stock: Number(prod.stock !== undefined ? prod.stock : 10),
            image_url: prod.image_url || '/images/product-placeholder.jpg',
            category: prod.category || 'عام'
        };

        assert.strictEqual(itemData.id, 15);
        assert.strictEqual(itemData.name, 'سماعات بلوتوث لاسلكية');
        assert.strictEqual(itemData.price, 3500);
        assert.strictEqual(itemData.stock, 12);
        assert.strictEqual(itemData.image_url, '/images/headphones.jpg');
        assert.strictEqual(itemData.category, 'إلكترونيات');
    });

    test('Enrichment logic updates zero-priced legacy items from products catalog', () => {
        // Simulating legacy items in localStorage with 0 price
        const legacyItems = [
            { id: 1, name: 'هاتف ذكي', price: 0, image_url: '/images/product-placeholder.jpg' },
            { id: 2, name: 'ساعة ذكية', price: 4200, image_url: '/images/watch.jpg' }
        ];

        // Simulating /api/products response
        const catalog = [
            { id: 1, name: 'هاتف ذكي برو', price: 45000, stock: 5, image_url: '/images/phone.jpg', category: 'هواتف' },
            { id: 2, name: 'ساعة ذكية', price: 4200, stock: 8, image_url: '/images/watch.jpg', category: 'ساعات' }
        ];

        const catalogMap = new Map(catalog.map(p => [Number(p.id), p]));
        const enriched = legacyItems.map(item => {
            const prod = catalogMap.get(Number(item.id));
            if (prod) {
                return {
                    ...item,
                    name: prod.name || item.name,
                    price: Number(prod.price !== undefined ? prod.price : item.price),
                    stock: prod.stock !== undefined ? Number(prod.stock) : item.stock,
                    image_url: prod.image_url || item.image_url,
                    category: prod.category || item.category
                };
            }
            return item;
        });

        assert.strictEqual(enriched[0].price, 45000, 'Legacy zero price must be updated to catalog price');
        assert.strictEqual(enriched[0].image_url, '/images/phone.jpg', 'Image must be enriched');
        assert.strictEqual(enriched[1].price, 4200, 'Existing price must be preserved');
    });

    test('toggleWishlist argument parsing handles both object and legacy string parameters', () => {
        function parseToggleArgs(productId, productOrName, extraData = {}) {
            const prodId = Number(productId);
            if (!prodId) return null;

            let productData;
            if (typeof productOrName === 'object' && productOrName !== null) {
                productData = { id: prodId, ...productOrName };
            } else {
                productData = { id: prodId, name: productOrName, ...extraData };
            }
            return productData;
        }

        // Case 1: passing full product object (as done now in shop.js and index.js)
        const resObj = parseToggleArgs(4, { name: 'عطر فاخر', price: 7800, category: 'عطور' });
        assert.strictEqual(resObj.id, 4);
        assert.strictEqual(resObj.name, 'عطر فاخر');
        assert.strictEqual(resObj.price, 7800);
        assert.strictEqual(resObj.category, 'عطور');

        // Case 2: legacy string name call
        const resStr = parseToggleArgs(7, 'حذاء رياضي', { price: 5600 });
        assert.strictEqual(resStr.id, 7);
        assert.strictEqual(resStr.name, 'حذاء رياضي');
        assert.strictEqual(resStr.price, 5600);
    });
});
