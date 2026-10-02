/**
 * js/pages/cart.js
 * Cart Page Logic & Interactions
 */

// JavaScript لصفحة العربة - تفاعلية كاملة مع تحديث فوري وبدون إعادة تحميل الصفحة
let cartItems = [];
let appliedPromo = getSavedPromo();
let discountRate = appliedPromo ? (appliedPromo.discount || 0) : 0;

function getSavedPromo() {
  try {
    const p = localStorage.getItem('promoCode');
    return p ? JSON.parse(p) : null;
  } catch (e) {
    return null;
  }
}

// جلب البيانات: إذا كان المستخدم مسجلاً جلب من API، وإلا الاعتماد على localStorage
async function loadCart() {
  appliedPromo = getSavedPromo();
  discountRate = appliedPromo ? (appliedPromo.discount || 0) : 0;

  const currentUser = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
  if (currentUser) {
    try {
      const response = await fetch('/api/cart', { credentials: 'include' });
      if (response.ok) {
        const apiItems = await response.json();
        if (Array.isArray(apiItems) && apiItems.length > 0) {
          cartItems = apiItems.map(item => ({
            id: item.id,
            product_id: item.product_id,
            name: item.name || (window.I18n ? window.I18n.t('product.store_customer', 'منتج') : 'منتج'),
            category: item.category || item.category_name || '',
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1,
            image_url: item.image_url || '/images/christopher-gower-m_HRfLhgABo-unsplash.jpg'
          }));
          saveCartToLocalStorage();
          renderCart();
          updateSummary();
          updateHeaderCount();
          syncCartProductsMetadata();
          return;
        }
      }
    } catch (error) {
      console.warn('Could not fetch remote cart, using local cart:', error);
    }
  }

  loadCartFromLocalStorage();
  saveCartToLocalStorage();
  renderCart();
  updateSummary();
  updateHeaderCount();
  syncCartProductsMetadata();
}

function loadCartFromLocalStorage() {
  const saved = localStorage.getItem('cart');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      cartItems = parsed.map(item => ({
        id: item.id,
        product_id: item.product_id || item.id,
        variant_id: item.variant_id || item.variantId || null,
        cartKey: item.cartKey || (item.variant_id ? `${item.id}_v${item.variant_id}` : String(item.id)),
        name: item.name || (window.I18n ? window.I18n.t('product.store_customer', 'منتج') : 'منتج'),
        category: item.category || item.category_name || '',
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        image_url: item.image_url || item.image || '/images/christopher-gower-m_HRfLhgABo-unsplash.jpg'
      }));
    } catch (e) {
      cartItems = [];
    }
  } else {
    cartItems = [];
  }
}

async function syncCartProductsMetadata() {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return;
  let hasUpdates = false;
  await Promise.all(cartItems.map(async (item) => {
    const prodId = item.product_id || item.id;
    if (!prodId) return;
    try {
      const res = await fetch(`/api/products/${prodId}`);
      if (res.ok) {
        const prod = await res.json();
        if (prod && prod.category && item.category !== prod.category) {
          item.category = prod.category;
          hasUpdates = true;
        }
      }
    } catch (e) {}
  }));

  if (hasUpdates) {
    saveCartToLocalStorage();
    renderCart();
  }
}

function saveCartToLocalStorage() {
  localStorage.setItem('cart', JSON.stringify(cartItems));
}

function updateHeaderCount() {
  const countBadges = document.querySelectorAll('.cart-count');
  const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  countBadges.forEach(badge => {
    badge.textContent = totalQty;
  });
}

// عرض عناصر العربة
function renderCart() {
  const grid = document.getElementById('cart-items-grid');
  const emptyCart = document.getElementById('empty-cart');
  const summaryBox = document.getElementById('cart-summary');

  if (cartItems.length === 0) {
    if (grid) grid.style.display = 'none';
    if (emptyCart) emptyCart.style.display = 'block';
    if (summaryBox) summaryBox.style.display = 'none';
    return;
  }

  if (grid) grid.style.display = 'block';
  if (emptyCart) emptyCart.style.display = 'none';
  if (summaryBox) summaryBox.style.display = 'block';

  grid.innerHTML = cartItems.map((item, index) => {
    const itemKey = item.cartKey || (item.variant_id ? `${item.id}_v${item.variant_id}` : String(item.id));
    const safeName = window.escapeHtml ? window.escapeHtml(item.name) : item.name;
    const safeCat = window.escapeHtml ? window.escapeHtml(item.category || (window.I18n ? window.I18n.t('categories.general', 'عام') : 'عام')) : (item.category || 'عام');
    return `
    <div class="cart-item" id="cart-item-${itemKey}" data-id="${item.id}" data-key="${itemKey}">
      <img ${index === 0 ? '' : 'loading="lazy"'} src="${window.escapeHtml ? window.escapeHtml(item.image_url || '/images/product-placeholder.jpg') : (item.image_url || '/images/product-placeholder.jpg')}" alt="${safeName}">
      <div class="item-details">
        <h3>${safeName}</h3>
        <p style="color: var(--light-text, #64748b); font-size: 0.85rem; margin-top: 2px;">${safeCat}</p>
        <p class="item-price" style="font-weight: 700; color: var(--primary-color); margin-top: 5px;">${Number(item.price).toLocaleString()} ${window.I18n ? window.I18n.t('common.currency', 'دج') : 'دج'}</p>
      </div>
      <div class="item-quantity">
        <button type="button" class="quantity-btn decrease" data-action="change-qty" data-key="${itemKey}" data-delta="-1">-</button>
        <input type="number" id="input-qty-${itemKey}" class="cart-qty-input" value="${item.quantity}" min="1" max="99" data-action="qty-input" data-key="${itemKey}">
        <button type="button" class="quantity-btn increase" data-action="change-qty" data-key="${itemKey}" data-delta="1">+</button>
      </div>
      <div class="item-total" id="total-${itemKey}" style="font-weight: 800; color: var(--dark-color, #1e293b);">${(Number(item.price) * Number(item.quantity)).toLocaleString()} ${window.I18n ? window.I18n.t('common.currency', 'دج') : 'دج'}</div>
      <button type="button" class="remove-item" data-action="remove-item" data-key="${itemKey}" data-i18n-title="cart.remove_item" title="${window.I18n ? window.I18n.t('cart.remove_item', 'إزالة المنتج') : 'إزالة المنتج'}">
          <i class="fas fa-trash-alt"></i>
        </button>
    </div>
  `;}).join('');

  if (window.I18n && typeof window.I18n.translatePage === 'function') {
    window.I18n.translatePage();
  }
}

// تعديل الكمية مباشرة وبشكل تفاعلي بدون إعادة إرسال الطلب بالكامل
function changeQuantity(key, delta) {
  const target = String(key);
  const item = cartItems.find(i => String(i.cartKey || i.id) === target || String(i.id) === target);
  if (!item) return;

  const newQty = Math.max(1, Math.min(99, item.quantity + delta));
  if (newQty === item.quantity) return;

  updateItemQuantityUI(item, newQty);
}

function handleQtyInputChange(key, val) {
  const target = String(key);
  const item = cartItems.find(i => String(i.cartKey || i.id) === target || String(i.id) === target);
  if (!item) return;

  let newQty = parseInt(val, 10);
  if (isNaN(newQty) || newQty < 1) newQty = 1;
  if (newQty > 99) newQty = 99;

  updateItemQuantityUI(item, newQty);
}

function updateItemQuantityUI(item, newQty) {
  item.quantity = newQty;
  const itemKey = item.cartKey || (item.variant_id ? `${item.id}_v${item.variant_id}` : String(item.id));

  const inputEl = document.getElementById(`input-qty-${itemKey}`) || document.getElementById(`input-qty-${item.id}`);
  if (inputEl) inputEl.value = newQty;

  const totalEl = document.getElementById(`total-${itemKey}`) || document.getElementById(`total-${item.id}`);
  if (totalEl) totalEl.textContent = (item.price * newQty).toLocaleString() + ' ' + (window.I18n ? window.I18n.t('common.currency', 'دج') : 'دج');

  saveCartToLocalStorage();
  updateSummary();
  updateHeaderCount();

  const currentUser = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
  if (currentUser) {
    fetch(`/api/cart/${item.id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: newQty })
    }).catch(() => {});
  }
}

// حذف المنتج تفاعلياً وبسلاسة
function removeCartPageItem(key) {
  const target = String(key);
  const itemEl = document.getElementById(`cart-item-${target}`) || document.getElementById(`cart-item-${key}`);
  if (itemEl) {
    itemEl.style.transition = 'all 0.3s ease';
    itemEl.style.opacity = '0';
    itemEl.style.transform = 'translateX(20px)';
  }

  setTimeout(() => {
    cartItems = cartItems.filter(i => String(i.cartKey || i.id) !== target && String(i.id) !== target);
    saveCartToLocalStorage();
    renderCart();
    updateSummary();
    updateHeaderCount();

    const currentUser = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    if (currentUser) {
      const removedItem = cartItems.find(i => String(i.cartKey || i.id) === target);
      const numericId = removedItem ? removedItem.id : (Number(key) || key);
      fetch(`/api/cart/${numericId}`, { method: 'DELETE', credentials: 'include' }).catch(() => {});
    }
  }, 250);
}

// تحديث ملخص السلة والحسابات
function updateSummary() {
  const summaryBox = document.getElementById('cart-summary');
  if (!summaryBox) return;

  if (cartItems.length === 0) {
    summaryBox.style.display = 'none';
    return;
  }
  summaryBox.style.display = 'block';

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  appliedPromo = getSavedPromo();
  const currentCode = appliedPromo ? appliedPromo.code : '';
  
  let discount = 0;
  if (appliedPromo) {
    if (appliedPromo.calculatedDiscount && appliedPromo.calculatedDiscount > 0) {
      discount = Math.min(subtotal, appliedPromo.calculatedDiscount);
    } else if (appliedPromo.discount && appliedPromo.discount > 0) {
      discount = Math.round(subtotal * appliedPromo.discount);
    }
  }
  const estimatedTotal = Math.max(0, subtotal - discount);

  summaryBox.innerHTML = `
    <h2 data-i18n="cart.summary">ملخص الطلب</h2>
    <div class="summary-item"><span><span data-i18n="checkout.subtotal">المجموع الفرعي</span></span><strong style="color:var(--dark-color, #1e293b);">${subtotal.toLocaleString()} ${window.I18n ? window.I18n.t('common.currency', 'دج') : 'دج'}</strong></div>
    <div class="summary-item" style="border-bottom: 1px dashed var(--border-color, #e2e8f0); padding-bottom: 8px;">
      <span><span data-i18n="checkout.shipping_cost">مصاريف الشحن</span></span>
      <span style="font-size: 0.88rem; color: var(--primary-color); font-weight: bold;">
        <i class="fas fa-truck" style="margin-left: 4px;"></i> <span data-i18n="cart.shipping_calc">تُحسب حسب الولاية عند الدفع</span>
      </span>
    </div>
    ${discount > 0 ? `<div class="summary-item discount" style="color:var(--success-color); font-weight: bold;"><span><span data-i18n="checkout.discount">الخصم</span> ${currentCode ? `(${window.escapeHtml ? window.escapeHtml(currentCode) : currentCode})` : ''}</span><span>-${discount.toLocaleString()} ${window.I18n ? window.I18n.t('common.currency', 'دج') : 'دج'}</span></div>` : ''}
    <div class="summary-total">
      <span><span data-i18n="cart.total_pre_shipping">المجموع (قبل الشحن)</span></span>
      <strong style="color: var(--primary-color); font-size: 1.25rem;">${estimatedTotal.toLocaleString()} ${window.I18n ? window.I18n.t('common.currency', 'دج') : 'دج'}</strong>
    </div>
    <p style="font-size: 0.82rem; color: var(--light-text, #64748b); margin: 8px 0 14px; line-height: 1.4;">
      <span data-i18n="cart.shipping_note">* سيتم احتساب تكلفة التوصيل الدقيقة (400 - 900 دج) وإضافتها للإجمالي النهائي بعد اختيار ولايتك في صفحة الدفع.</span>
    </p>
    
    <div class="promo-code" style="margin-top: 10px; display: flex; gap: 8px;">
      <input type="text" id="promo-code" data-action="promo-input" placeholder="${window.I18n ? window.I18n.t('cart.promo_placeholder', 'أدخل كود الخصم (مثل: SAVE10)') : 'أدخل كود الخصم (مثل: SAVE10)'}" value="${window.escapeHtml ? window.escapeHtml(currentCode) : currentCode}">
      ${discount > 0 ? `
        <button type="button" class="apply-promo" data-action="remove-promo" style="background: var(--danger-color, #ef4444); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: bold; cursor: pointer;"><span data-i18n="cart.remove_promo">إلغاء الخصم</span></button>
      ` : `
        <button type="button" class="apply-promo" data-action="apply-promo"><span data-i18n="cart.apply_promo">تطبيق</span></button>
      `}
    </div>
    <button type="button" class="checkout-btn" data-action="checkout" style="margin-top: 15px;"><span data-i18n="cart.checkout_btn">متابعة إلى الدفع</span> <i class="fas fa-arrow-left" style="margin-right: 8px;"></i></button>
    <a href="shop.html" class="continue-shopping" style="display: block; margin-top: 10px;"><span data-i18n="cart.continue_shopping">متابعة التسوق</span></a>
  `;

  if (window.I18n && typeof window.I18n.translatePage === 'function') {
    window.I18n.translatePage();
  }
}

// تطبيق كود الخصم عبر قاعدة البيانات
async function applyPromoCode(codeArg) {
  let code = codeArg;
  if (typeof code !== 'string') {
    const input = document.getElementById('promo-code');
    code = input ? input.value : '';
  }
  code = String(code || '').trim().toUpperCase();

  if (!code) {
    removePromoCode();
    return;
  }

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  try {
    const response = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, orderAmount: subtotal })
    });
    const data = await response.json();

    if (response.ok && data.valid) {
      let discRate = 0;
      if (data.discountPercent > 0) {
        discRate = data.discountPercent / 100;
      } else if (data.calculatedDiscount > 0 && subtotal > 0) {
        discRate = data.calculatedDiscount / subtotal;
      } else {
        discRate = 0.1;
      }
      discountRate = discRate;
      appliedPromo = {
        code: data.code || code,
        discount: discRate,
        calculatedDiscount: data.calculatedDiscount || Math.round(subtotal * discRate)
      };
      localStorage.setItem('promoCode', JSON.stringify(appliedPromo));
      
      const successMsg = data.message || (window.I18n ? window.I18n.t('messages.promo_success', 'تم تطبيق الخصم بنجاح! ({discount}%)').replace('{discount}', Math.round(discRate * 100)) : 'تم تطبيق الخصم بنجاح!');
      if (window.showToast) window.showToast(successMsg, 'success');
      else alert(successMsg);
    } else {
      removePromoCode();
      const errMsg = getErrorMessage(data, 'messages.promo_invalid');
      if (window.showToast) window.showToast(errMsg, 'error');
      else alert(errMsg);
    }
  } catch (err) {
    removePromoCode();
    const errMsg = window.I18n ? window.I18n.t('messages.server_error', 'خطأ في الاتصال بالخادم') : 'خطأ في الاتصال بالخادم';
    if (window.showToast) window.showToast(errMsg, 'error');
  }
  updateSummary();
}

function removePromoCode() {
  localStorage.removeItem('promoCode');
  discountRate = 0;
  appliedPromo = null;
  if (window.showToast) window.showToast(window.I18n ? window.I18n.t('messages.promo_canceled', 'تم إلغاء كود الخصم') : 'تم إلغاء كود الخصم', 'info');
  updateSummary();
}

// التوجه إلى صفحة الدفع
function proceedToCheckout() {
  if (cartItems.length === 0) {
    if (window.showToast) window.showToast(window.I18n ? window.I18n.t('messages.cart_empty', 'عربة التسوق فارغة') : 'عربة التسوق فارغة', 'warning');
    else alert(window.I18n ? window.I18n.t('messages.cart_empty', 'عربة التسوق فارغة') : 'عربة التسوق فارغة');
    return;
  }
  window.location.href = 'checkout.html';
}

// Event Delegation Central Handler
document.addEventListener('click', (e) => {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;

  const action = actionEl.getAttribute('data-action');
  if (action === 'change-qty') {
    const key = actionEl.getAttribute('data-key');
    const delta = parseInt(actionEl.getAttribute('data-delta'), 10) || 0;
    changeQuantity(key, delta);
  } else if (action === 'remove-item') {
    const key = actionEl.getAttribute('data-key');
    removeCartPageItem(key);
  } else if (action === 'apply-promo') {
    applyPromoCode();
  } else if (action === 'remove-promo') {
    removePromoCode();
  } else if (action === 'checkout') {
    proceedToCheckout();
  }
});

document.addEventListener('change', (e) => {
  const qtyInput = e.target.closest('[data-action="qty-input"]');
  if (qtyInput) {
    const key = qtyInput.getAttribute('data-key');
    handleQtyInputChange(key, qtyInput.value);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const promoInput = e.target.closest('#promo-code, [data-action="promo-input"]');
    if (promoInput) {
      e.preventDefault();
      applyPromoCode();
    }
  }
});

// تهيئة عند بدء تحميل الصفحة
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadCart);
} else {
  loadCart();
}

// تصدير الدوال على window لضمان التوافق الكامل مع أي استدعاءات خارجية
window.loadCart = loadCart;
window.changeQuantity = changeQuantity;
window.handleQtyInputChange = handleQtyInputChange;
window.updateItemQuantityUI = updateItemQuantityUI;
window.removeCartPageItem = removeCartPageItem;
window.updateSummary = updateSummary;
window.applyPromoCode = applyPromoCode;
window.removePromoCode = removePromoCode;
window.proceedToCheckout = proceedToCheckout;
