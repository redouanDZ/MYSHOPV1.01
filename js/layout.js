/**
 * Shared Layout Injection Module (Header & Footer) for MYSHOP
 * Dynamically provides the canonical header, navigation, and footer templates
 * while preserving active navigation states, data-i18n translation bindings,
 * theme controls, and cart/wishlist badge counters.
 */
(function () {
  'use strict';

  function getActivePageKey() {
    const pathname = window.location.pathname.toLowerCase();
    if (pathname.endsWith('shop.html')) return 'shop';
    if (pathname.endsWith('cart.html')) return 'cart';
    if (pathname.endsWith('wishlist.html')) return 'wishlist';
    if (pathname.endsWith('track-order.html')) return 'track';
    if (pathname.endsWith('account.html')) return 'account';
    if (pathname.endsWith('checkout.html')) return 'cart';
    if (pathname.endsWith('order-confirmation.html')) return 'cart';
    if (pathname.endsWith('product.html')) return 'shop';
    return 'home';
  }

  function getHeaderTemplate() {
    const active = getActivePageKey();
    const isHomePage = active === 'home';

    return `
    <header id="main-header">
      <div class="container">
        <div class="logo">
          <a href="index.html">
            <img src="/images/logo.png" alt="Logo" class="site-logo-img" width="38" height="38" style="height: 38px; width: 38px; border-radius: 10px; object-fit: cover; margin-inline-end: 8px; vertical-align: middle;">
            <span data-i18n="common.store_name">MYSHOP</span>
          </a>
        </div>
        <nav class="main-nav">
          <ul>
            <li><a href="index.html" class="${active === 'home' ? 'active' : ''}"><i class="fas fa-home"></i> <span data-i18n="nav.home">الرئيسية</span></a></li>
            <li><a href="shop.html" class="${active === 'shop' ? 'active' : ''}"><i class="fas fa-shopping-bag"></i> <span data-i18n="nav.shop">التسوق</span></a></li>
            <li><a href="cart.html" class="${active === 'cart' ? 'active' : ''}"><i class="fas fa-shopping-cart"></i> <span data-i18n="nav.cart">عربة التسوق</span></a></li>
            <li><a href="wishlist.html" class="${active === 'wishlist' ? 'active' : ''}"><i class="fas fa-heart"></i> <span data-i18n="nav.wishlist">المفضلة</span></a></li>
            <li><a href="track-order.html" class="${active === 'track' ? 'active' : ''}"><i class="fas fa-truck"></i> <span data-i18n="nav.track_order">تتبع طلبي</span></a></li>
          </ul>
        </nav>
        <div class="user-actions">
          <button type="button" class="theme-toggle-btn" data-action="toggleTheme" data-i18n-title="common.toggle_theme" title="تبديل الوضع">
            <i class="fas fa-moon"></i>
          </button>
          <!-- Wishlist -->
          <a href="wishlist.html" class="wishlist-icon ${active === 'wishlist' ? 'active' : ''}" data-i18n-title="common.wishlist" title="المفضلة">
            <i class="fas fa-heart" style="color: var(--danger-color);"></i>
            <span class="wishlist-count" id="wishlist-count">0</span>
          </a>
          <!-- Shopping Cart -->
          <a href="cart.html" class="cart-icon ${active === 'cart' ? 'active' : ''}" data-i18n-title="common.cart_title" title="السلة">
            <i class="fas fa-shopping-cart"></i>
            <span class="cart-count">0</span>
          </a>
          <!-- User Icon -->
          <a href="account.html" class="user-icon ${active === 'account' ? 'active' : ''}" data-i18n-title="common.my_account" title="حسابي">
            <i class="fas fa-user"></i>
          </a>
          <button type="button" class="mobile-menu-btn" data-i18n-title="common.menu" data-i18n-aria-label="common.menu" aria-label="القائمة">
            <i class="fas fa-bars"></i>
          </button>
        </div>
      </div>
    </header>
    ${isHomePage ? `
    <div class="search-bar">
      <div class="container">
        <form action="shop.html" method="GET">
          <input type="text" name="search" data-i18n-placeholder="common.search_placeholder" placeholder="ابحث عن ملابس، إلكترونيات، عطور، أدوات منزلية...">
          <button type="submit"><i class="fas fa-search"></i> <span data-i18n="common.search">بحث</span></button>
        </form>
      </div>
    </div>` : ''}
    `;
  }

  function getFooterTemplate() {
    return `
    <footer id="main-footer">
      <div class="container">
        <div class="footer-grid">
          <!-- Store Description -->
          <div class="footer-col">
            <div style="font-size: 1.4rem; font-weight: 900; color: var(--bg-color, #fff); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-shopping-bag" style="color: var(--primary-color);"></i> <span class="footer-brand dynamic-store-name" data-i18n="footer.brand">المتجر الإلكتروني</span>
            </div>
            <p style="line-height: 1.6; color: var(--light-text); font-size: 0.92rem;" data-i18n="footer.tagline">وجهتك الموثوقة للتسوق الإلكتروني في الجزائر، منتجات عالية الجودة، شحن سريع لـ 58 ولاية، وضمان الدفع عند الاستلام.</p>
          </div>

          <!-- Quick Links -->
          <div class="footer-col">
            <h3 data-i18n="footer.quick_links">روابط سريعة</h3>
            <ul>
              <li><a href="index.html"><i class="fas fa-chevron-left" style="font-size: 0.7rem; margin-inline-end: 6px;"></i> <span data-i18n="footer.link_home">الرئيسية</span></a></li>
              <li><a href="shop.html"><i class="fas fa-chevron-left" style="font-size: 0.7rem; margin-inline-end: 6px;"></i> <span data-i18n="footer.link_shop">متجر المنتجات</span></a></li>
              <li><a href="cart.html"><i class="fas fa-chevron-left" style="font-size: 0.7rem; margin-inline-end: 6px;"></i> <span data-i18n="footer.link_cart">سلة التسوق</span></a></li>
              <li><a href="wishlist.html"><i class="fas fa-chevron-left" style="font-size: 0.7rem; margin-inline-end: 6px;"></i> <span data-i18n="footer.link_wishlist">قائمة المفضلة</span></a></li>
              <li><a href="track-order.html"><i class="fas fa-chevron-left" style="font-size: 0.7rem; margin-inline-end: 6px;"></i> <span data-i18n="footer.link_track">تتبع طلبيتك</span></a></li>
              <li><a href="terms.html"><i class="fas fa-chevron-left" style="font-size: 0.7rem; margin-inline-end: 6px;"></i> <span data-i18n="footer.link_terms">الشروط والأحكام</span></a></li>
              <li><a href="privacy.html"><i class="fas fa-chevron-left" style="font-size: 0.7rem; margin-inline-end: 6px;"></i> <span data-i18n="footer.link_privacy">سياسة الخصوصية</span></a></li>
            </ul>
          </div>

          <!-- Customer Support -->
          <div class="footer-col">
            <h3 data-i18n="footer.contact">خدمة العملاء والتواصل</h3>
            <ul>
              <li><i class="fas fa-map-marker-alt" style="color: var(--primary-color); margin-inline-end: 8px;"></i> <span data-i18n="footer.address" class="footer-address">الجزائر العاصمة، الجزائر</span></li>
              <li><i class="fas fa-envelope" style="color: var(--primary-color); margin-inline-end: 8px;"></i> <span class="footer-email">contact@myshop.dz</span></li>
              <li><i class="fas fa-clock" style="color: var(--primary-color); margin-inline-end: 8px;"></i> <span data-i18n="footer.hours">السبت - الخميس: 9:00 ص - 6:00 م</span></li>
            </ul>
          </div>

          <!-- Payment Methods & Social -->
          <div class="footer-col">
            <h3 data-i18n="footer.payment_shipping">طرق الدفع والشحن</h3>
            <p style="font-size: 0.88rem; color: var(--light-text); margin-bottom: 12px;" data-i18n="footer.payment_desc">نقبل الدفع الآمن عند الاستلام أو عبر البطاقات الإلكترونية الجزائرية:</p>
            <div style="display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap;">
              <span style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; color: var(--text-color);"><i class="fas fa-money-bill-wave" style="color: var(--success-color);"></i> <span data-i18n="footer.cod_cash">COD نقداً</span></span>
              <span style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; color: var(--text-color);"><i class="fas fa-credit-card" style="color: var(--secondary-color);"></i> EDAHABIA / CIB</span>
            </div>
            <h3 data-i18n="footer.follow">تابعنا على الشبكات</h3>
            <div class="social-links">
              <a href="#" title="Facebook" class="facebook" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
              <a href="#" title="Instagram" class="instagram" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
              <a href="#" title="TikTok" class="tiktok" aria-label="TikTok"><i class="fab fa-tiktok"></i></a>
            </div>
          </div>
        </div>

        <div class="footer-bottom" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; margin-top: 30px;">
          <p style="margin: 0; font-size: 0.88rem; color: var(--light-text);">&copy; <span class="dynamic-year">2026</span> <span class="dynamic-store-name">MYSHOP</span>. <span data-i18n="common.rights_reserved">جميع الحقوق محفوظة.</span></p>
          <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
            <a href="landing.html" style="color: #38bdf8; text-decoration: none; font-size: 0.88rem; font-weight: bold; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-bolt"></i> <span data-i18n="footer.myshop_pro">امتلك متجراً مثل هذا (MYSHOP Pro)</span></a>
            <span style="font-size: 0.88rem; color: var(--light-text);" data-i18n="footer.made_in">صُمم بأعلى معايير الأمان والتجارة الإلكترونية في الجزائر 🇩🇿</span>
          </div>
        </div>
      </div>
    </footer>
    `;
  }

  function syncCounters() {
    // 1. Sync Cart Count
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const items = JSON.parse(savedCart);
        const count = Array.isArray(items) ? items.reduce((s, it) => s + (it.quantity || 1), 0) : 0;
        document.querySelectorAll('.cart-count').forEach(el => { el.textContent = count; });
      }
    } catch (e) {}

    // 2. Sync Wishlist Count
    try {
      const savedWish = localStorage.getItem('wishlist');
      if (savedWish) {
        const ids = JSON.parse(savedWish);
        const count = Array.isArray(ids) ? ids.length : 0;
        document.querySelectorAll('#wishlist-count, .wishlist-count').forEach(el => { el.textContent = count; });
      }
    } catch (e) {}
  }

  function initLayout() {
    // Target element: #site-header or <header data-layout="auto"> or first <header>
    const headerPlaceholder = document.getElementById('site-header') || document.querySelector('header[data-layout="auto"]');
    if (headerPlaceholder) {
      headerPlaceholder.outerHTML = getHeaderTemplate();
    }

    // Target element: #site-footer or <footer data-layout="auto"> or first <footer>
    const footerPlaceholder = document.getElementById('site-footer') || document.querySelector('footer[data-layout="auto"]');
    if (footerPlaceholder) {
      footerPlaceholder.outerHTML = getFooterTemplate();
    }

    // Sync counters
    syncCounters();

    // Trigger i18n translation on newly injected layout elements
    if (window.I18n && typeof window.I18n.translatePage === 'function') {
      window.I18n.translatePage();
    }
  }

  // Auto-init on DOMContentLoaded or immediately if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLayout);
  } else {
    initLayout();
  }

  window.ShopLayout = {
    init: initLayout,
    getHeaderTemplate,
    getFooterTemplate,
    syncCounters
  };
})();

document.addEventListener('click', e => {
    const actionEl = e.target.closest('[data-action]');
    if (actionEl && actionEl.dataset.action === 'toggleTheme') {
        if (typeof window.toggleTheme === 'function') window.toggleTheme();
    }
});
