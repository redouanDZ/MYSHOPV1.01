// Global variables and initialization

/**
 * استخراج رسالة الخطأ المترجمة بناءً على كود الخطأ أو الرسالة الاحتياطية
 * @param {Object|Error|string} data 
 * @param {string} [fallbackKey] 
 * @returns {string}
 */
function getErrorMessage(data, fallbackKey = 'errors.SERVER_ERROR') {
    if (data && typeof data === 'object') {
        const code = data.code || (data.data && data.data.code);
        if (code && typeof window !== 'undefined' && window.I18n) {
            const errKey = 'errors.' + code;
            const dict = window.I18n.cache ? window.I18n.cache[window.I18n.currentLang] : null;
            if (dict && typeof window.I18n.getValue === 'function') {
                const val = window.I18n.getValue(dict, errKey);
                if (val) return val;
            }
            const tVal = window.I18n.t(errKey, '');
            if (tVal && tVal !== errKey) return tVal;
        }
        if (data.message) return data.message;
        if (data.error) return data.error;
    } else if (typeof data === 'string' && data.trim()) {
        return data;
    }

    if (fallbackKey) {
        if (typeof window !== 'undefined' && window.I18n) {
            const fbVal = window.I18n.t(fallbackKey, '');
            if (fbVal && fbVal !== fallbackKey) return fbVal;
        }
        return fallbackKey;
    }

    return '';
}

if (typeof window !== 'undefined' && !window.getErrorMessage) {
    window.getErrorMessage = getErrorMessage;
}

/**
 * Dark / Light Theme Manager
 */
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (document.body) document.body.classList.add('dark-mode');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    if (document.body) document.body.classList.remove('dark-mode');
  }
}

// Run immediately to avoid page flicker
initTheme();

let lastThemeToggleTime = 0;
function toggleTheme() {
  const now = Date.now();
  if (now - lastThemeToggleTime < 300) return;
  lastThemeToggleTime = now;

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', newTheme);
  if (document.body) {
    if (newTheme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  localStorage.setItem('theme', newTheme);
  updateThemeToggleIcons(newTheme);

  if (window.showToast) {
    const msg = newTheme === 'dark' 
      ? (window.I18n ? window.I18n.t('theme.dark_enabled', 'تم تفعيل الوضع الليلي 🌙') : 'تم تفعيل الوضع الليلي 🌙')
      : (window.I18n ? window.I18n.t('theme.light_enabled', 'تم تفعيل الوضع الفاتح ☀️') : 'تم تفعيل الوضع الفاتح ☀️');
    window.showToast(msg, 'info');
  }
}

function updateThemeToggleIcons(theme) {
  const buttons = document.querySelectorAll('.theme-toggle-btn');
  const titleLight = window.I18n ? window.I18n.t('theme.switch_light', 'التبديل إلى الوضع الفاتح') : 'التبديل إلى الوضع الفاتح';
  const titleDark = window.I18n ? window.I18n.t('theme.switch_dark', 'التبديل إلى الوضع الليلي') : 'التبديل إلى الوضع الليلي';
  buttons.forEach(btn => {
    const icon = btn.querySelector('i');
    if (icon) {
      if (theme === 'dark') {
        icon.className = 'fas fa-sun';
        btn.setAttribute('title', titleLight);
        btn.setAttribute('aria-label', titleLight);
      } else {
        icon.className = 'fas fa-moon';
        btn.setAttribute('title', titleDark);
        btn.setAttribute('aria-label', titleDark);
      }
    }
  });
}

function setupThemeToggleButtons() {
  const userActionsList = document.querySelectorAll('.user-actions');
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const titleLight = window.I18n ? window.I18n.t('theme.switch_light', 'التبديل إلى الوضع الفاتح') : 'التبديل إلى الوضع الفاتح';
  const titleDark = window.I18n ? window.I18n.t('theme.switch_dark', 'التبديل إلى الوضع الليلي') : 'التبديل إلى الوضع الليلي';

  userActionsList.forEach(container => {
    if (!container.querySelector('.theme-toggle-btn')) {
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'theme-toggle-btn';
      toggleBtn.onclick = toggleTheme;
      toggleBtn.innerHTML = `<i class="${currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'}"></i>`;
      toggleBtn.setAttribute('title', currentTheme === 'dark' ? titleLight : titleDark);
      
      const userIcon = container.querySelector('.user-icon');
      if (userIcon) {
        container.insertBefore(toggleBtn, userIcon);
      } else {
        container.appendChild(toggleBtn);
      }
    }
  });

  updateThemeToggleIcons(currentTheme);
}

// Make globally accessible
window.toggleTheme = toggleTheme;
window.initTheme = initTheme;

/**
 * Universal HTML Sanitization Helper to defend against DOM / Stored XSS
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

/**
 * Wishlist Manager (Synchronized with window.WishlistManager)
 */
function getWishlist() {
  if (window.WishlistManager) {
    return window.WishlistManager.getLocalItems().map(p => Number(p.id));
  }
  try {
    const raw = localStorage.getItem('myshop_wishlist') || localStorage.getItem('wishlist');
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
      return parsed.map(p => Number(p.id));
    }
    return Array.isArray(parsed) ? parsed.map(Number) : [];
  } catch (e) {
    return [];
  }
}

async function toggleWishlist(productId, productOrName = (window.I18n ? window.I18n.t('common.product', 'المنتج') : 'المنتج'), extraData = {}) {
  const prodId = Number(productId);
  if (!prodId) return false;

  let productData;
  if (typeof productOrName === 'object' && productOrName !== null) {
    productData = { id: prodId, ...productOrName };
  } else {
    productData = { id: prodId, name: productOrName, ...extraData };
  }

  const productName = productData.name || (window.I18n ? window.I18n.t('common.product', 'المنتج') : 'المنتج');

  if (window.WishlistManager) {
    const result = await window.WishlistManager.toggleItem(productData);
    updateWishlistUI();
    return result;
  }

  let wishlist = getWishlist();
  const index = wishlist.indexOf(prodId);
  let isAdded = false;

  if (index > -1) {
    wishlist.splice(index, 1);
    showToast(window.I18n ? window.I18n.t('wishlist.removed_named', 'تم إزالة "{name}" من قائمة المفضلة').replace('{name}', productName) : `تم إزالة "${productName}" من قائمة المفضلة`, 'info');
  } else {
    wishlist.push(prodId);
    isAdded = true;
    showToast(window.I18n ? window.I18n.t('wishlist.added_named', 'تمت إضافة "{name}" إلى قائمة المفضلة ❤️').replace('{name}', productName) : `تمت إضافة "${productName}" إلى قائمة المفضلة ❤️`, 'success');
  }

  localStorage.setItem('wishlist', JSON.stringify(wishlist));
  updateWishlistUI();
  return isAdded;
}

function updateWishlistUI() {
  const wishlist = getWishlist();
  const count = wishlist.length;
  const wishlistBadges = document.querySelectorAll('.wishlist-count, #wishlist-count');
  wishlistBadges.forEach(badge => {
    badge.textContent = count;
  });

  // Update heart buttons on cards
  const wishlistBtns = document.querySelectorAll('[data-wishlist-id], .product-wishlist');
  wishlistBtns.forEach(btn => {
    const id = parseInt(btn.getAttribute('data-wishlist-id'), 10);
    const icon = btn.querySelector('i');
    if (id && wishlist.includes(id)) {
      btn.classList.add('active');
      if (icon) icon.className = 'fas fa-heart text-danger';
    } else {
      btn.classList.remove('active');
      if (icon) icon.className = 'far fa-heart';
    }
  });
}

window.getWishlist = getWishlist;
window.toggleWishlist = toggleWishlist;
window.updateWishlistUI = updateWishlistUI;

/**
 * Global Toast Notification System
 * @param {string} message - نص الإشعار
 * @param {string} type - نوع الإشعار: 'success' | 'error' | 'warning' | 'info'
 * @param {number} duration - مدة الظهور بالملي ثانية (افتراضي 3500ms)
 */
function showToast(message, type = 'success', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'status');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;

  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };

  const iconClass = icons[type] || icons.success;

  toast.innerHTML = `
    <div class="toast-content">
      <i class="${iconClass} toast-icon"></i>
      <span class="toast-message">${window.escapeHtml ? window.escapeHtml(message) : message}</span>
    </div>
    <button type="button" class="toast-close" aria-label="${window.I18n ? window.I18n.t('common.close', 'إغلاق') : 'إغلاق'}">&times;</button>
    <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('toast-show');
  });

  let dismissTimeout = setTimeout(() => {
    removeToast(toast);
  }, duration);

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    clearTimeout(dismissTimeout);
    removeToast(toast);
  });

  toast.addEventListener('mouseenter', () => {
    clearTimeout(dismissTimeout);
    const progress = toast.querySelector('.toast-progress');
    if (progress) progress.style.animationPlayState = 'paused';
  });

  toast.addEventListener('mouseleave', () => {
    const progress = toast.querySelector('.toast-progress');
    if (progress) progress.style.animationPlayState = 'running';
    dismissTimeout = setTimeout(() => {
      removeToast(toast);
    }, 1500);
  });
}

function removeToast(toast) {
  if (!toast) return;
  toast.classList.remove('toast-show');
  toast.classList.add('toast-hide');
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
}

window.showToast = showToast;

/**
 * Back To Top Button Handler
 */
function initBackToTop() {
  let btn = document.getElementById('back-to-top');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'back-to-top';
    btn.type = 'button';
    btn.className = 'back-to-top-btn';
    btn.setAttribute('aria-label', window.I18n ? window.I18n.t('common.back_to_top', 'العودة إلى الأعلى') : 'العودة إلى الأعلى');
    btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    document.body.appendChild(btn);

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  });
}

/**
 * Newsletter Form Handler
 */
function initNewsletter() {
  const forms = document.querySelectorAll('form[data-newsletter], .newsletter-form, footer form');
  forms.forEach(form => {
    if (form.dataset.newsletterBound) return;
    form.dataset.newsletterBound = 'true';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (input && input.value.trim()) {
        showToast(window.I18n ? window.I18n.t('footer.newsletter_success', 'شكراً لاشتراكك في النشرة البريدية! 🎉 ستبدأ بتلقي العروض قريباً.') : 'شكراً لاشتراكك في النشرة البريدية! 🎉 ستبدأ بتلقي العروض قريباً.', 'success');
        input.value = '';
      } else {
        showToast(window.I18n ? window.I18n.t('footer.newsletter_invalid', 'يرجى إدخال البريد الإلكتروني بشكل صحيح') : 'يرجى إدخال البريد الإلكتروني بشكل صحيح', 'warning');
      }
    });
  });
}

// Sync cart counter on page load
function syncCartCounter() {
  const savedCart = localStorage.getItem('cart');
  if (savedCart) {
    try {
      const cartItems = JSON.parse(savedCart);
      const totalCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
      const cartCounts = document.querySelectorAll('.cart-count');
      cartCounts.forEach(el => el.textContent = totalCount);
    } catch (e) {}
  }
}

// Network Status Watcher (Online / Offline mode)
function initNetworkStatusWatcher() {
  const banner = document.createElement('div');
  banner.id = 'offline-notification-banner';
  banner.style.cssText = 'display:none; position:relative; width:100%; z-index:10000; background:#dc2626; color:var(--bg-color, #fff); text-align:center; padding:10px 15px; font-weight:bold; font-size:0.92rem; box-shadow:0 4px 12px rgba(0,0,0,0.2);';
  const offlineText = () => (window.I18n
    ? window.I18n.t('common.offline_notice', 'أنت غير متصل بالإنترنت حالياً (وضع التصفح دون اتصال). يلزم الاتصال لتأكيد الطلبات.')
    : (window.I18n ? window.I18n.t('common.offline_notice') : 'Offline'));
  banner.innerHTML = `<i class="fas fa-wifi"></i> ${offlineText()}`;
  document.body.prepend(banner);

  function updateStatus() {
    if (!navigator.onLine) {
      banner.style.display = 'block';
    } else {
      if (banner.style.display === 'block') {
        banner.style.display = 'none';
        if (window.showToast) {
          window.showToast(window.I18n ? window.I18n.t('common.online_notice', '✅ تمت استعادة الاتصال بالإنترنت بنجاح!') : '✅ تمت استعادة الاتصال بالإنترنت بنجاح!', 'success');
        }
      }
    }
  }

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  if (!navigator.onLine) updateStatus();
  document.addEventListener('languageChanged', () => {
    banner.innerHTML = `<i class="fas fa-wifi"></i> ${offlineText()}`;
  });
}

// Service Worker Registration
function registerPwaServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(() => {})
        .catch(() => {});
    });
  }
}

/**
 * Mobile Navigation Drawer Manager
 */
function initMobileNavigation() {
  const header = document.querySelector('header');
  if (!header) return;

  const container = header.querySelector('.container');
  if (!container) return;

  // Check or create mobile hamburger button
  let menuBtn = container.querySelector('.mobile-menu-btn');
  if (!menuBtn) {
    menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'mobile-menu-btn';
    menuBtn.setAttribute('aria-label', (window.I18n && window.I18n.t) ? window.I18n.t('nav.open_menu', 'فتح القائمة الرئيسية') : 'فتح القائمة الرئيسية');
    menuBtn.setAttribute('data-i18n-aria-label', 'nav.open_menu');
    menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    container.appendChild(menuBtn);
  }

  // Create overlay & drawer if not present
  let overlay = document.getElementById('mobile-nav-overlay');
  let drawer = document.getElementById('mobile-nav-drawer');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'mobile-nav-overlay';
    overlay.className = 'mobile-nav-overlay';
    document.body.appendChild(overlay);
  }

  if (!drawer) {
    drawer = document.createElement('div');
    drawer.id = 'mobile-nav-drawer';
    drawer.className = 'mobile-nav-drawer';
    
    // Fixed link definitions: labels are translated through data-i18n on the <span>
    // (never on the <a>, otherwise translatePage() would wipe the icon).
    const currentPath = window.location.pathname;
    const drawerItems = [
      { href: 'index.html', icon: 'fas fa-home', key: 'nav.home', fb: 'الرئيسية' },
      { href: 'shop.html', icon: 'fas fa-shopping-bag', key: 'nav.shop', fb: 'التسوق' },
      { href: 'cart.html', icon: 'fas fa-shopping-cart', key: 'nav.cart', fb: 'عربة التسوق' },
      { href: 'wishlist.html', icon: 'fas fa-heart', key: 'nav.wishlist', fb: 'المفضلة' },
      { href: 'track-order.html', icon: 'fas fa-truck', key: 'nav.track_order', fb: 'تتبع طلبي' }
    ];
    const t = (k, fb) => (window.I18n && window.I18n.t) ? window.I18n.t(k, fb) : fb;
    const linksHtml = drawerItems.map(it => {
      const active = currentPath.endsWith('/' + it.href) || (it.href === 'index.html' && (currentPath === '/' || currentPath.endsWith('/'))) ? 'active' : '';
      return `<li><a href="${it.href}" class="${active}"><i class="${it.icon}"></i> <span data-i18n="${it.key}">${t(it.key, it.fb)}</span></a></li>`;
    }).join('');

    drawer.innerHTML = `
      <div class="mobile-drawer-header">
        <div class="drawer-logo">
          <i class="fas fa-shopping-bag" style="color: var(--primary-color);"></i> <span data-i18n="nav.drawer_title">${t('nav.drawer_title', 'المتجر الإلكتروني')}</span>
        </div>
        <button type="button" class="mobile-drawer-close" data-i18n-aria-label="nav.close_menu" aria-label="${t('nav.close_menu', 'إغلاق القائمة')}">&times;</button>
      </div>
      <ul class="mobile-drawer-links">
        ${linksHtml}
      </ul>
      <div class="mobile-drawer-footer">
        <a href="account.html" class="btn btn-outline" style="width: 100%; justify-content: center; font-size: 0.92rem; padding: 10px;">
          <i class="fas fa-user-circle"></i> <span data-i18n="nav.account">${t('nav.account', 'حسابي')}</span>
        </a>
      </div>
    `;
    if (window.I18n && window.I18n.translatePage) window.I18n.translatePage(drawer);
    document.body.appendChild(drawer);
  }

  function openDrawer() {
    overlay.classList.add('active');
    drawer.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    overlay.classList.remove('active');
    drawer.classList.remove('active');
    document.body.style.overflow = '';
  }

  menuBtn.addEventListener('click', openDrawer);
  overlay.addEventListener('click', closeDrawer);
  
  const closeBtn = drawer.querySelector('.mobile-drawer-close');
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.mobile-menu-btn');
    if (trigger) {
      e.preventDefault();
      openDrawer();
    }
    const closeTrigger = e.target.closest('.mobile-drawer-close');
    if (closeTrigger) {
      e.preventDefault();
      closeDrawer();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('active')) {
      closeDrawer();
    }
  });
}

function getLocalizedStoreName(rawName) {
  const currentLang = (window.I18n && window.I18n.currentLang) || document.documentElement.lang || 'ar';
  const defaultDemoNames = ['MYSHOP', (window.I18n ? window.I18n.t('common.store_brand_title', 'متجر MYSHOP التجريبي') : 'متجر MYSHOP التجريبي'), 'Boutique MYSHOP Démo', 'MYSHOP Demo Store'];
  if (!rawName || defaultDemoNames.includes(String(rawName).trim())) {
    if (window.I18n && typeof window.I18n.t === 'function') {
      const translated = window.I18n.t('common.store_brand_title');
      if (translated && translated !== 'common.store_brand_title') return translated;
    }
    if (currentLang === 'fr') return 'Boutique MYSHOP Démo';
    if (currentLang === 'en') return 'MYSHOP Demo Store';
    return (window.I18n ? window.I18n.t('common.store_brand_title', 'متجر MYSHOP التجريبي') : 'متجر MYSHOP التجريبي');
  }
  return rawName;
}

/**
 * Apply Global Dynamic Store Settings (Logo, Branding, Social, Policies, Announcement, Payment Toggles)
 */
function applyGlobalStoreSettings(settings) {
  if (!settings) return;

  // 1. Update Document Title / Favicon
  if (settings.store_favicon) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = settings.store_favicon;
  }
  
  const localizedStoreName = getLocalizedStoreName(settings.store_name);

  if (localizedStoreName) {
    // Update document title suffix safely without removing the page name
    const currentTitle = document.title;
    if (currentTitle.includes('-')) {
        document.title = currentTitle.split('-')[0] + '- ' + localizedStoreName;
    } else {
        document.title = localizedStoreName;
    }

    // Update footer brand or other hardcoded store names
    document.querySelectorAll('[data-i18n="footer.brand"], .footer-brand').forEach(el => {
        el.textContent = localizedStoreName;
        el.removeAttribute('data-i18n'); // Prevent re-translation overwriting dynamic store name
    });

    // Update footer dynamic text separately from translations
    document.querySelectorAll('.dynamic-store-name').forEach(el => el.textContent = localizedStoreName);
    document.querySelectorAll('.dynamic-year').forEach(el => el.textContent = new Date().getFullYear());

    // Update any legacy footer copyright elements
    document.querySelectorAll('[data-i18n="footer.copyright"], [data-i18n="checkout.footer_copyright"]').forEach(el => {
        const rightsText = (window.I18n && window.I18n.t('common.rights_reserved')) || 'جميع الحقوق محفوظة.';
        el.innerHTML = `&copy; <span class="dynamic-year">${new Date().getFullYear()}</span> <span class="dynamic-store-name">${window.escapeHtml ? window.escapeHtml(localizedStoreName) : localizedStoreName}</span>. <span data-i18n="common.rights_reserved">${rightsText}</span>`;
        el.removeAttribute('data-i18n');
    });
  }

  // 2. Update Header Brand Name & Logo
  document.querySelectorAll('.logo a').forEach(logoLink => {
    let content = '';
    if (settings.store_logo) {
      const altText = window.escapeHtml ? window.escapeHtml(localizedStoreName || '') || 'MYSHOP' : (localizedStoreName || 'MYSHOP');
      content += `<img src="${settings.store_logo}" alt="${altText}"  style="max-height: 40px; width: 40px; height: 40px; border-radius: 10px; object-fit: cover; vertical-align: middle; margin-inline-end: 10px; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);">`;
    }
    if (settings.store_name) {
      content += `<span class="store-name-text" style="vertical-align: middle;">${window.escapeHtml ? window.escapeHtml(localizedStoreName) : localizedStoreName}</span>`;
    }
    
    if (content) {
        logoLink.innerHTML = content;
        logoLink.style.display = 'flex';
        logoLink.style.alignItems = 'center';
    }
  });

  // 3. Update Announcement Bar if present
  const announcementEl = document.querySelector('.top-announcement-bar') || document.getElementById('announcement-bar');
  if (announcementEl && settings.announcement_bar_text) {
    announcementEl.textContent = settings.announcement_bar_text;
  }

  // 4. Update Footer Contact Info & Social Links
  document.querySelectorAll('.footer-phone, .contact-phone').forEach(el => {
    if (settings.store_phone) {
      el.textContent = settings.store_phone;
      if (el.tagName === 'A') el.href = `tel:${settings.store_phone}`;
    }
  });

  document.querySelectorAll('.footer-email, .contact-email').forEach(el => {
    if (settings.store_email) {
      el.textContent = settings.store_email;
      if (el.tagName === 'A') el.href = `mailto:${settings.store_email}`;
    }
  });

  // Fallback for footer contact icons without specific classes
  if (settings.store_email) {
    document.querySelectorAll('footer li, .footer-col li').forEach(li => {
      if (li.querySelector('.fa-envelope') && !li.querySelector('.footer-email')) {
        const icon = li.querySelector('.fa-envelope').outerHTML;
        li.innerHTML = `${icon} <span class="footer-email">${window.escapeHtml ? window.escapeHtml(settings.store_email) : settings.store_email}</span>`;
      }
    });
  }
  if (settings.store_phone) {
    document.querySelectorAll('footer li, .footer-col li').forEach(li => {
      if ((li.querySelector('.fa-phone') || li.querySelector('.fa-phone-alt')) && !li.querySelector('.footer-phone')) {
        const icon = (li.querySelector('.fa-phone') || li.querySelector('.fa-phone-alt')).outerHTML;
        li.innerHTML = `${icon} <span class="footer-phone">${window.escapeHtml ? window.escapeHtml(settings.store_phone) : settings.store_phone}</span>`;
      }
    });
  }

  document.querySelectorAll('.footer-address, .contact-address, [data-i18n="footer.address"]').forEach(el => {
    const addr = (settings.store_address || '').trim();
    // Default (Arabic) demo address => keep the translated i18n text; only a custom address overrides it.
    const defaults = [(window.I18n ? window.I18n.t('footer.address_val', 'الجزائر العاصمة، الجزائر') : 'الجزائر العاصمة، الجزائر'), 'Alger, Algérie', 'Algiers, Algeria'];
    if (addr && !defaults.includes(addr)) {
      el.removeAttribute('data-i18n');
      el.textContent = addr;
    }
  });

  document.querySelectorAll('.social-links a.facebook, a.facebook').forEach(el => {
    if (settings.facebook_url) el.href = settings.facebook_url;
  });

  document.querySelectorAll('.social-links a.instagram, a.instagram').forEach(el => {
    if (settings.instagram_url) el.href = settings.instagram_url;
  });

  document.querySelectorAll('.social-links a.tiktok, a.tiktok').forEach(el => {
    if (settings.tiktok_url) el.href = settings.tiktok_url;
  });

  // 5. Payment Methods Visibility Control (Checkout / Express)
  if (settings.enable_cod === 'false') {
    const codRadio = document.querySelector('input[name="paymentMethod"][value="cod"]') || document.querySelector('.cod-option');
    if (codRadio) {
      const container = codRadio.closest('.payment-option') || codRadio.parentElement;
      if (container) container.style.display = 'none';
    }
  }

  if (settings.enable_chargily === 'false') {
    const chargilyRadio = document.querySelector('input[name="paymentMethod"][value="chargily"]') || document.querySelector('.chargily-option');
    if (chargilyRadio) {
      const container = chargilyRadio.closest('.payment-option') || chargilyRadio.parentElement;
      if (container) container.style.display = 'none';
    }
  }
}

/**
 * Marketing Pixels & Event Tracker
 */
async function initMarketingPixels() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const settings = await res.json();
    if (!settings) return;

    window.storeSettings = settings;
    // Cache settings for offline/fallback use by other pages (e.g. invoice.html)
    try { localStorage.setItem('store_settings_cache', JSON.stringify(settings)); } catch(e) {}
    applyGlobalStoreSettings(settings);

    // 1. Facebook Pixel
    if (settings.facebook_pixel_id && typeof window.fbq !== 'function') {
      (function(f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function() {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
        n.queue = []; t = b.createElement(e); t.async = !0;
        t.src = v; s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

      window.fbq('init', String(settings.facebook_pixel_id).trim());
      window.fbq('track', 'PageView');
    }

    // 2. TikTok Pixel
    if (settings.tiktok_pixel_id && typeof window.ttq !== 'object') {
      (function (w, d, t) {
        w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
        ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
        ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
        for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
        ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; };
        ttq.load = function (e, n) {
          var i = "https://analytics.tiktok.com/i18n/pixel/events.js";
          ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = i; ttq._t = ttq._t || {}; ttq._t[e] = +new Date(); ttq._o = ttq._o || {}; ttq._o[e] = n || {};
          var o = document.createElement("script"); o.type = "text/javascript"; o.async = !0; o.src = i + "?sdkid=" + e + "&lib=" + t;
          var a = document.getElementsByTagName("script")[0]; a.parentNode.insertBefore(o, a);
        };
        ttq.load(String(settings.tiktok_pixel_id).trim());
        ttq.page();
      })(window, document, 'ttq');
    }

    // 3. Google Analytics 4
    if (settings.google_analytics_id) {
      const gaScript = document.createElement('script');
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(settings.google_analytics_id.trim())}`;
      document.head.appendChild(gaScript);

      window.dataLayer = window.dataLayer || [];
      function gtag() { window.dataLayer.push(arguments); }
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', settings.google_analytics_id.trim());
    }

    // Custom helper to track e-commerce actions
    window.trackPixelEvent = function(eventName, params = {}) {
      if (typeof window.fbq === 'function') window.fbq('track', eventName, params);
      if (typeof window.ttq === 'object' && typeof window.ttq.track === 'function') window.ttq.track(eventName, params);
      if (typeof window.gtag === 'function') window.gtag('event', eventName, params);
    };
  } catch (e) {}
}

/**
 * Mobile Bottom Sticky Navigation Bar
 */
function initMobileBottomBar() {
  if (document.querySelector('.mobile-bottom-nav') || window.location.pathname.includes('/admin/')) {
    return;
  }
  // invoice.html is a standalone printable receipt: it doesn't load css/style.css,
  // so this nav would render completely unstyled (overlapping icons/labels) there.
  if (window.location.pathname.includes('invoice.html')) {
    return;
  }

  const path = window.location.pathname;
  const isHome = path.endsWith('index.html') || path.endsWith('/') || path === '';
  const isShop = path.includes('shop.html') || path.includes('product.html');
  const isWishlist = path.includes('wishlist.html');
  const isCart = path.includes('cart.html') || path.includes('checkout.html');
  const isAccount = path.includes('account.html');

  const bottomNav = document.createElement('nav');
  bottomNav.className = 'mobile-bottom-nav';
  bottomNav.id = 'mobileBottomNav';
  bottomNav.setAttribute('aria-label', window.I18n ? window.I18n.t('nav.bottom_label', 'شريط التنقل السفلي للهاتف') : 'شريط التنقل السفلي للهاتف');
  bottomNav.setAttribute('data-i18n-aria-label', 'nav.bottom_label');

  bottomNav.innerHTML = `
    <a href="index.html" class="mobile-nav-item ${isHome ? 'active' : ''}">
      <i class="fas fa-home"></i>
      <span data-i18n="nav.home">الرئيسية</span>
    </a>
    <a href="shop.html" class="mobile-nav-item ${isShop ? 'active' : ''}">
      <i class="fas fa-shopping-bag"></i>
      <span data-i18n="nav.shop">التسوق</span>
    </a>
    <a href="wishlist.html" class="mobile-nav-item ${isWishlist ? 'active' : ''}">
      <div class="nav-icon-badge-wrap">
        <i class="fas fa-heart"></i>
        <span class="mobile-badge wishlist-count">0</span>
      </div>
      <span data-i18n="nav.wishlist">المفضلة</span>
    </a>
    <a href="cart.html" class="mobile-nav-item ${isCart ? 'active' : ''}">
      <div class="nav-icon-badge-wrap">
        <i class="fas fa-shopping-cart"></i>
        <span class="mobile-badge cart-count">0</span>
      </div>
      <span data-i18n="nav.cart_short">السلة</span>
    </a>
    <a href="account.html" class="mobile-nav-item ${isAccount ? 'active' : ''}">
      <i class="fas fa-user"></i>
      <span data-i18n="nav.account">حسابي</span>
    </a>
  `;

  document.body.appendChild(bottomNav);
  if (window.I18n && window.I18n.translatePage) window.I18n.translatePage(bottomNav);

  syncCartCounter();
  updateWishlistUI();
}

// Page Initialization
document.addEventListener('DOMContentLoaded', () => {
  try {
    const cached = localStorage.getItem('store_settings_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      window.storeSettings = parsed;
      applyGlobalStoreSettings(parsed);
    }
  } catch(e) {}

  initTheme();
  setupThemeToggleButtons();
  initMobileNavigation();
  initMobileBottomBar();
  initBackToTop();
  initNewsletter();
  updateWishlistUI();
  syncCartCounter();
  initNetworkStatusWatcher();
  registerPwaServiceWorker();
  initMarketingPixels();
  document.addEventListener('languageChanged', () => {
    if (window.storeSettings) applyGlobalStoreSettings(window.storeSettings);
  });
});

