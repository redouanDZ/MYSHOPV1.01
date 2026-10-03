/**
 * test/terms_privacy.test.js
 * Verification suite for Terms & Conditions and Privacy Policy integration:
 * 1. HTTP 200 for /terms.html and /privacy.html
 * 2. Complete i18n key presence and parity across ar.json, fr.json, and en.json
 * 3. Strict CSP compliance: no inline scripts or on* event attributes
 * 4. Required section anchors and checkout checkbox linkage
 */

process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME || 'ecommerce_store_test';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_env_db_pass_12345';

const { describe, test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const app = require('../src/app');

describe('Terms & Conditions and Privacy Policy Test Suite', () => {
    const rootDir = path.join(__dirname, '..');
    const termsHtmlPath = path.join(rootDir, 'terms.html');
    const privacyHtmlPath = path.join(rootDir, 'privacy.html');
    const checkoutHtmlPath = path.join(rootDir, 'checkout.html');

    const arLocPath = path.join(rootDir, 'locales', 'ar.json');
    const frLocPath = path.join(rootDir, 'locales', 'fr.json');
    const enLocPath = path.join(rootDir, 'locales', 'en.json');

    // Helper to start temporary server for HTTP tests
    let server;
    let baseUrl;

    test.before(async () => {
        await new Promise((resolve) => {
            server = http.createServer(app).listen(0, '127.0.0.1', () => {
                const port = server.address().port;
                baseUrl = `http://127.0.0.1:${port}`;
                resolve();
            });
        });
    });

    test.after(async () => {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
    });

    test('1. HTTP GET /terms.html returns 200 with HTML content type', async () => {
        const res = await fetch(`${baseUrl}/terms.html`);
        assert.strictEqual(res.status, 200, 'Expected /terms.html to return 200');
        const contentType = res.headers.get('content-type') || '';
        assert.ok(contentType.includes('text/html'), 'Expected text/html content-type');
        const text = await res.text();
        assert.ok(text.includes('id="definitions"'), 'Expected definitions section');
        assert.ok(text.includes('id="returns"'), 'Expected returns section for anchor link');
    });

    test('2. HTTP GET /privacy.html returns 200 with HTML content type', async () => {
        const res = await fetch(`${baseUrl}/privacy.html`);
        assert.strictEqual(res.status, 200, 'Expected /privacy.html to return 200');
        const contentType = res.headers.get('content-type') || '';
        assert.ok(contentType.includes('text/html'), 'Expected text/html content-type');
        const text = await res.text();
        assert.ok(text.includes('id="data-collected"'), 'Expected data-collected section');
        assert.ok(text.includes('id="cookies"'), 'Expected cookies section');
    });

    test('3. Locales parity: ar.json, fr.json, and en.json contain terms and privacy keys', () => {
        const ar = JSON.parse(fs.readFileSync(arLocPath, 'utf8'));
        const fr = JSON.parse(fs.readFileSync(frLocPath, 'utf8'));
        const en = JSON.parse(fs.readFileSync(enLocPath, 'utf8'));

        assert.ok(ar.terms, 'ar.json must have terms section');
        assert.ok(fr.terms, 'fr.json must have terms section');
        assert.ok(en.terms, 'en.json must have terms section');

        assert.ok(ar.privacy, 'ar.json must have privacy section');
        assert.ok(fr.privacy, 'fr.json must have privacy section');
        assert.ok(en.privacy, 'en.json must have privacy section');

        const arTermsKeys = Object.keys(ar.terms).sort();
        const frTermsKeys = Object.keys(fr.terms).sort();
        const enTermsKeys = Object.keys(en.terms).sort();
        assert.deepStrictEqual(arTermsKeys, frTermsKeys, 'terms keys between ar and fr must match');
        assert.deepStrictEqual(arTermsKeys, enTermsKeys, 'terms keys between ar and en must match');

        const arPrivKeys = Object.keys(ar.privacy).sort();
        const frPrivKeys = Object.keys(fr.privacy).sort();
        const enPrivKeys = Object.keys(en.privacy).sort();
        assert.deepStrictEqual(arPrivKeys, frPrivKeys, 'privacy keys between ar and fr must match');
        assert.deepStrictEqual(arPrivKeys, enPrivKeys, 'privacy keys between ar and en must match');

        // Check footer link keys
        assert.ok(ar.footer.link_terms && fr.footer.link_terms && en.footer.link_terms, 'footer.link_terms must exist in all locales');
        assert.ok(ar.footer.link_privacy && fr.footer.link_privacy && en.footer.link_privacy, 'footer.link_privacy must exist in all locales');
    });

    test('4. Strict CSP compliance: No inline scripts in terms.html and privacy.html', () => {
        const termsContent = fs.readFileSync(termsHtmlPath, 'utf8');
        const privacyContent = fs.readFileSync(privacyHtmlPath, 'utf8');

        // Inline script check: <script> tags must have src attribute and no inline JS body
        const scriptTagRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

        let match;
        while ((match = scriptTagRegex.exec(termsContent)) !== null) {
            const attrs = match[1];
            const body = match[2].trim();
            assert.ok(attrs.includes('src='), `Found script without src attribute in terms.html: ${match[0]}`);
            assert.strictEqual(body.length, 0, `Found inline script body in terms.html: ${body}`);
        }

        while ((match = scriptTagRegex.exec(privacyContent)) !== null) {
            const attrs = match[1];
            const body = match[2].trim();
            assert.ok(attrs.includes('src='), `Found script without src attribute in privacy.html: ${match[0]}`);
            assert.strictEqual(body.length, 0, `Found inline script body in privacy.html: ${body}`);
        }

        // Inline event handler check (e.g. onclick=, onload=)
        const inlineHandlerRegex = /\son[a-z]+\s*=/i;
        assert.strictEqual(inlineHandlerRegex.test(termsContent), false, 'terms.html must not contain on* event attributes');
        assert.strictEqual(inlineHandlerRegex.test(privacyContent), false, 'privacy.html must not contain on* event attributes');
    });

    test('5. Checkbox linkage and state verification in checkout.html', () => {
        const checkoutContent = fs.readFileSync(checkoutHtmlPath, 'utf8');

        // Ensure terms checkbox is NOT checked by default
        const checkboxMatch = checkoutContent.match(/<input[^>]*id=["']terms["'][^>]*>/i);
        assert.ok(checkboxMatch, 'terms input must exist in checkout.html');
        assert.strictEqual(/\bchecked\b/i.test(checkboxMatch[0]), false, 'terms input must NOT be checked by default');
        assert.ok(/\brequired\b/i.test(checkboxMatch[0]), 'terms input must retain required attribute');

        // Ensure links to terms.html and terms.html#returns with target="_blank" and rel="noopener"
        assert.ok(checkoutContent.includes('href="terms.html"'), 'checkout.html must link to terms.html');
        assert.ok(checkoutContent.includes('href="terms.html#returns"'), 'checkout.html must link to terms.html#returns');
        assert.ok(checkoutContent.includes('target="_blank"'), 'links must specify target="_blank"');
        assert.ok(checkoutContent.includes('rel="noopener"'), 'links must specify rel="noopener"');
    });
});
