/**
 * check-i18n.js
 * 
 * I18n Integrity & Parity Scanner:
 * 1. Verifies exact key parity across locales/ar.json, locales/fr.json, locales/en.json.
 * 2. Scans store HTML pages and store JS scripts for unlocalized Arabic text
 *    outside data-i18n* attributes, I18n.t() calls, comments, and excluded paths.
 */

const fs = require('fs');
const path = require('path');

let hasErrors = false;

// ==========================================
// 1. Check Key Parity Across Locales
// ==========================================
console.log('🔍 Checking locale keys parity (ar.json, fr.json, en.json)...');

function getNestedKeys(obj, prefix = '') {
    let keys = [];
    for (const [k, v] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            keys = keys.concat(getNestedKeys(v, fullKey));
        } else {
            keys.push(fullKey);
        }
    }
    return keys;
}

let arJson = null;
let frJson = null;
let enJson = null;

try {
    const arPath = path.join(__dirname, '..', 'locales', 'ar.json');
    const frPath = path.join(__dirname, '..', 'locales', 'fr.json');
    const enPath = path.join(__dirname, '..', 'locales', 'en.json');

    arJson = JSON.parse(fs.readFileSync(arPath, 'utf8'));
    frJson = JSON.parse(fs.readFileSync(frPath, 'utf8'));
    enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));

    const arKeys = new Set(getNestedKeys(arJson));
    const frKeys = new Set(getNestedKeys(frJson));
    const enKeys = new Set(getNestedKeys(enJson));

    const allKeys = new Set([...arKeys, ...frKeys, ...enKeys]);

    const missingInAr = [...allKeys].filter(k => !arKeys.has(k));
    const missingInFr = [...allKeys].filter(k => !frKeys.has(k));
    const missingInEn = [...allKeys].filter(k => !enKeys.has(k));

    if (missingInAr.length > 0) {
        console.error(`❌ [locales/ar.json] Missing ${missingInAr.length} keys:`, missingInAr.slice(0, 10));
        hasErrors = true;
    }
    if (missingInFr.length > 0) {
        console.error(`❌ [locales/fr.json] Missing ${missingInFr.length} keys:`, missingInFr.slice(0, 10));
        hasErrors = true;
    }
    if (missingInEn.length > 0) {
        console.error(`❌ [locales/en.json] Missing ${missingInEn.length} keys:`, missingInEn.slice(0, 10));
        hasErrors = true;
    }

    if (!hasErrors) {
        console.log(`✅ All 3 locale files have identical key sets (${arKeys.size} keys each).`);
    }
} catch (err) {
    console.error('❌ Failed reading or parsing locale files:', err.message);
    hasErrors = true;
}

// ==========================================
// 2. Scan Store Pages For Unlocalized Arabic
// ==========================================
console.log('\n🔍 Scanning store pages and scripts for unlocalized Arabic text...');

const STORE_HTML_FILES = [
    'index.html',
    'shop.html',
    'product.html',
    'cart.html',
    'checkout.html',
    'account.html',
    'wishlist.html',
    'track-order.html',
    'order-confirmation.html',
    'invoice.html',
    'terms.html',
    'privacy.html'
];

const JS_DIR = path.join(__dirname, '..', 'js');
const STORE_JS_FILES = fs.existsSync(JS_DIR)
    ? fs.readdirSync(JS_DIR)
        .filter(f => f.endsWith('.js') && f !== 'i18n.js')
        .map(f => path.join('js', f))
    : [];

const ALL_STORE_FILES = [...STORE_HTML_FILES, ...STORE_JS_FILES];
const ARABIC_REGEX = /[\u0600-\u06FF]/;

function scanStoreFile(filePath) {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) return;

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split(/\r?\n/);
    const fileErrors = [];

    let inBlockComment = false;

    lines.forEach((rawLine, index) => {
        const lineNum = index + 1;
        let line = rawLine.trim();

        // Handle block comment markers
        if (inBlockComment) {
            if (line.includes('*/') || line.includes('-->')) {
                inBlockComment = false;
                line = line.replace(/^.*(\*\/|-->)/, '');
            } else {
                return;
            }
        }

        if (line.includes('/*') || line.includes('<!--')) {
            if (!line.includes('*/') && !line.includes('-->')) {
                inBlockComment = true;
            }
            line = line.replace(/(\/\*.*?\*\/|<!--.*?-->)/g, '');
        }

        // Single-line comment removal
        line = line.replace(/\/\/.*$/, '');

        // If line has no Arabic characters, pass
        if (!ARABIC_REGEX.test(line)) return;

        // Valid exceptions:
        // 1. Element has data-i18n or child has data-i18n
        if (/data-i18n/.test(line)) {
            // Check if there is an unlocalized placeholder/title/aria-label on this same line
            const hasUnlocalizedPlaceholder = /placeholder=["'][^"']*[\u0600-\u06FF][^"']*["']/.test(line) && !/data-i18n-placeholder/.test(line);
            const hasUnlocalizedTitle = /title=["'][^"']*[\u0600-\u06FF][^"']*["']/.test(line) && !/data-i18n-title/.test(line);
            const hasUnlocalizedAria = /aria-label=["'][^"']*[\u0600-\u06FF][^"']*["']/.test(line) && !/data-i18n-aria-label/.test(line);
            
            if (!hasUnlocalizedPlaceholder && !hasUnlocalizedTitle && !hasUnlocalizedAria) {
                return;
            }
        }

        // 2. I18n call fallback: I18n.t(...) or local t(...)
        if (/(?:window\.)?I18n\.t\(/.test(line) || /\bt\(['"][^'"]+['"],\s*['"][^'"]*[\u0600-\u06FF]/.test(line)) {
            return;
        }

        // 3. Fallback parameter inside data objects like fb: '...' or fallback: '...'
        if (/\b(?:fb|fallback)\s*:\s*['"][^'"]*[\u0600-\u06FF]/.test(line)) {
            return;
        }

        // 4. Color and term translation dictionaries (translating Arabic color/term names to French/English)
        if (/['"][\u0600-\u06FF\s]+['"]\s*:\s*['"][A-Za-zÀ-ÿ\s]+['"]/.test(line)) {
            return;
        }

        // 5. Search normalization, variant text replacements, and stemming
        if (/\.replace\(\/[^/]*[\u0600-\u06FF][^/]*\/[a-z]*/.test(line) || /startsWith\(['"][\u0600-\u06FF]+['"]\)/.test(line)) {
            return;
        }

        // 6. Multilingual dataset models (e.g. name_ar, name_fr)
        if (/\bname_ar\s*:\s*['"][\u0600-\u06FF\s]+['"]/.test(line)) {
            return;
        }

        // 7. Category search synonym lists or category filter values matching DB categories
        if (/name=["']categoryFilter["']/.test(line) || /count-[a-z]+['"]\s*:\s*['"][\u0600-\u06FF]/.test(line) || /^[0-9]+:\s*\[.*[\u0600-\u06FF]/.test(line) || /^['"][\u0600-\u06FF\s]+['"]:\s*\[/.test(line)) {
            return;
        }

        // 7. Check if unlocalized placeholder/title/aria-label
        const isPlaceholder = /placeholder=["'][^"']*[\u0600-\u06FF]/.test(line) && !/data-i18n-placeholder/.test(line);
        const isTitleAttr = /title=["'][^"']*[\u0600-\u06FF]/.test(line) && !/data-i18n-title/.test(line);
        const isAria = /aria-label=["'][^"']*[\u0600-\u06FF]/.test(line) && !/data-i18n-aria-label/.test(line);

        fileErrors.push({
            line: lineNum,
            snippet: line.length > 100 ? line.slice(0, 97) + '...' : line,
            type: isPlaceholder ? 'Missing data-i18n-placeholder' : (isTitleAttr ? 'Missing data-i18n-title' : (isAria ? 'Missing data-i18n-aria-label' : 'Unlocalized Arabic text'))
        });
    });

    if (fileErrors.length > 0) {
        hasErrors = true;
        console.error(`❌ [${filePath}] Found ${fileErrors.length} unlocalized item(s):`);
        fileErrors.forEach(err => {
            console.error(`   Line ${err.line} (${err.type}): ${err.snippet}`);
        });
    }
}

for (const file of ALL_STORE_FILES) {
    scanStoreFile(file);
}

// ==========================================
// 3. Check Controller Error Codes in Locales
// ==========================================
console.log('\n🔍 Checking controller error codes in locales (ar.json, fr.json, en.json)...');

const CONTROLLERS_DIR = path.join(__dirname, '..', 'src', 'controllers');
if (fs.existsSync(CONTROLLERS_DIR) && arJson && frJson && enJson) {
    const controllerFiles = fs.readdirSync(CONTROLLERS_DIR).filter(f => f.endsWith('.js'));
    const controllerCodes = new Map(); // code -> array of { file, line }

    controllerFiles.forEach(file => {
        const filePath = path.join(CONTROLLERS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');

        const resJsonRegex = /res\.(?:status\(\d+\)\.)?json\(\s*\{([\s\S]*?)\}\s*\)/g;
        let match;
        while ((match = resJsonRegex.exec(content)) !== null) {
            const body = match[1];
            const codeMatch = body.match(/code\s*:\s*['"]([A-Z0-9_]+)['"]/);
            if (codeMatch) {
                const code = codeMatch[1];
                const upToMatch = content.slice(0, match.index);
                const lineNum = upToMatch.split('\n').length;
                if (!controllerCodes.has(code)) {
                    controllerCodes.set(code, []);
                }
                controllerCodes.get(code).push({ file, line: lineNum });
            }
        }
    });

    const arErrors = arJson.errors || {};
    const frErrors = frJson.errors || {};
    const enErrors = enJson.errors || {};

    const missingCodesInAr = [];
    const missingCodesInFr = [];
    const missingCodesInEn = [];

    for (const [code, occurrences] of controllerCodes.entries()) {
        if (!arErrors[code]) missingCodesInAr.push({ code, occurrences });
        if (!frErrors[code]) missingCodesInFr.push({ code, occurrences });
        if (!enErrors[code]) missingCodesInEn.push({ code, occurrences });
    }

    if (missingCodesInAr.length > 0) {
        console.error(`❌ [locales/ar.json] Missing ${missingCodesInAr.length} error code(s):`);
        missingCodesInAr.forEach(({ code, occurrences }) => {
            const locs = occurrences.map(o => `${o.file}:${o.line}`).join(', ');
            console.error(`   errors.${code} (found in ${locs})`);
        });
        hasErrors = true;
    }

    if (missingCodesInFr.length > 0) {
        console.error(`❌ [locales/fr.json] Missing ${missingCodesInFr.length} error code(s):`);
        missingCodesInFr.forEach(({ code, occurrences }) => {
            const locs = occurrences.map(o => `${o.file}:${o.line}`).join(', ');
            console.error(`   errors.${code} (found in ${locs})`);
        });
        hasErrors = true;
    }

    if (missingCodesInEn.length > 0) {
        console.error(`❌ [locales/en.json] Missing ${missingCodesInEn.length} error code(s):`);
        missingCodesInEn.forEach(({ code, occurrences }) => {
            const locs = occurrences.map(o => `${o.file}:${o.line}`).join(', ');
            console.error(`   errors.${code} (found in ${locs})`);
        });
        hasErrors = true;
    }

    if (missingCodesInAr.length === 0 && missingCodesInFr.length === 0 && missingCodesInEn.length === 0) {
        console.log(`✅ All controller error codes (${controllerCodes.size} unique codes) are defined in ar.json, fr.json, and en.json.`);
    }
}

if (hasErrors) {
    console.error('\n❌ check:i18n failed! Please fix the errors above.');
    process.exit(1);
} else {
    console.log('\n✅ check:i18n passed! All locale keys match, controller codes are defined, and store pages are properly localized.');
    process.exit(0);
}

