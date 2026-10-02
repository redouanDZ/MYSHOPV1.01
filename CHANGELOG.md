# Changelog

All notable changes to the MYSHOP e-commerce platform are documented in this file.

## [Unreleased]

### Security
- Strict CSP is reported alongside the enforced policy; `CSP_STRICT=true` enforces it. All inline scripts moved to external files.
- Removed the wildcard `*.onrender.com` CORS rule (exact `BASE_URL` / `RENDER_EXTERNAL_URL` only).
- Rate limits configurable through `RATE_LIMIT_*` environment variables.

### Fixed
- Admin: pagination actions ran twice per click; settings save/upload/Telegram test ran twice; product image picker buttons had lost their handler.
- `robots.txt`, `sitemap.xml` and `og:url` no longer contain placeholder domains (generated from `BASE_URL`).
- Home page metadata is consistent with the multi-category store.

## [1.0.1] - 2026-09-30

### Storefront & Checkout
- **Product Cards**: Removed legacy conflicting CSS in `css/style.css`; unified home, shop, and related product cards with one-line action buttons, clamped titles, and aligned price/stock rows.
- **Responsive Layout**: Cart and checkout layouts rebuilt with responsive CSS Grid (`minmax(0, 1fr)`) to prevent horizontal overflow on mobile viewports.
- **Invoice & Confirmation**: Standalone printable invoice (`invoice.html`) adapted for mobile devices with responsive customer info and horizontally scrollable line-item tables; excluded global storefront bottom navigation bar from print view.
- **Touch Targets**: Raised touch targets on mobile (buttons to min 36px, wishlist icons to 34px) for better usability.
- **Localization (i18n)**: Fixed input and textarea placeholder localization using `data-i18n-placeholder` across Arabic, French, and English; removed hardcoded strings; added parity checking script (`npm run check:i18n`).
- **Asset Optimization**: Local self-hosted Font Awesome and Google Fonts (`/fonts`, `/vendor/fontawesome`); automated CSS minification (`css/style.min.css`); automated Service Worker cache version hashing (`scripts/build-sw-hash.js`).

### Admin Dashboard
- **Responsive KPI Cards**: Dashboard KPI cards dynamically adapt to fill each row without orphan cards; numbers maintain currency symbol on a single line.
- **Minification**: Admin dashboard CSS minified via automated build pipeline (`admin/css/dashboard.min.css`).
- **Touch Usability**: Pagination controls updated with minimum 36px touch targets.

### Security & Authentication
- **Database-Backed Sessions**: Transitioned session management to MySQL (`sessions` table) with server-side revocation (`revokeSession`, `revokeAllUserSessions`) and in-memory TTL caching (`SESSION_CACHE_TTL_MS`), ensuring user sessions survive server restarts while retaining instant invalidation capabilities.
- **Strict Content Security Policy (CSP)**: Completely eliminated inline scripts and event handlers across public and admin pages; enforced strict CSP via Helmet with conditional `CSP_REPORT_ONLY` support and dynamic pixel loader for Facebook, TikTok, and Google Analytics.
- **Production Guardrails**: Prevented demo seeding (`scripts/seedDemoData.js`) and demo product auto-injection from running when `NODE_ENV=production`.
- **Database Test Guard**: Enforced `*_test` naming requirement on database connections during automated test runs (`test/all.test.js`) to safeguard production databases.
- **Container Hardening**: Dockerfile updated with non-root `node` user, `--omit=dev` production installation, and native Docker `HEALTHCHECK`.

## [1.0.0] - Initial Release
- Complete Arabic (RTL), French, and English e-commerce store with Express and MySQL 8.
- Chargily Pay V2 (EDAHABIA / CIB) and Cash on Delivery (COD) payment integrations.
- Role-based admin dashboard for orders, products, variants, reviews, coupons, and customers.
- Direct 1-Click order checkout, order tracking, and thermal invoice printing.
