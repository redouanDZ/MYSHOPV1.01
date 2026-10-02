function t(key, fallback) {
    return (window.I18n && typeof window.I18n.t === 'function') ? window.I18n.t(key, fallback) : fallback;
}

function getSafeErrorMessage(data, fallbackKey = 'messages.load_invoice_error') {
    if (typeof getErrorMessage === 'function') {
        return getErrorMessage(data, fallbackKey);
    }
    if (window.getErrorMessage && typeof window.getErrorMessage === 'function') {
        return window.getErrorMessage(data, fallbackKey);
    }
    if (data && data.message) return data.message;
    if (data && data.error) return data.error;
    if (typeof data === 'string') return data;
    return t(fallbackKey, 'تعذر تحميل بيانات الفاتورة');
}

async function loadInvoiceStoreIdentity() {
            let settings = null;

            // Tier 1: use settings already fetched by main.js (fastest, no extra request)
            if (window.storeSettings && window.storeSettings.store_name) {
                settings = window.storeSettings;
            }

            // Tier 2: fetch directly from API
            if (!settings) {
                try {
                    const response = await fetch('/api/settings', { credentials: 'include' });
                    if (response.ok) {
                        settings = await response.json();
                        // Update the shared cache for next time
                        try { localStorage.setItem('store_settings_cache', JSON.stringify(settings)); } catch(e) {}
                    }
                } catch (error) {
                    console.warn('Invoice: API fetch failed, trying cache...', error);
                }
            }

            // Tier 3: fall back to localStorage cache (works when opened without server)
            if (!settings || !settings.store_name) {
                try {
                    const cached = localStorage.getItem('store_settings_cache');
                    if (cached) settings = JSON.parse(cached);
                } catch(e) {}
            }

            if (!settings) return; // nothing to do, HTML placeholders remain

            const storeName    = String(settings.store_name    || '').trim() || null;
            const storeTagline = String(settings.store_tagline || '').trim();
            const storePhone   = String(settings.store_phone   || '').trim();
            const storeEmail   = String(settings.store_email   || '').trim();

            if (storeName) {
                document.title = (window.I18n ? window.I18n.t('invoice.title', 'فاتورة الطلب') : 'فاتورة الطلب') + ' - ' + storeName;
                document.getElementById('invStoreName').textContent = storeName;
            }

            if (storeTagline) {
                document.getElementById('invStoreTagline').textContent = storeTagline;
            }

            const contactParts = [];
            if (storePhone) contactParts.push((window.I18n ? window.I18n.t('invoice.phone', 'الهاتف:') : 'هاتف:') + ' ' + storePhone);
            if (storeEmail) contactParts.push((window.I18n ? window.I18n.t('invoice.email', 'البريد:') : 'بريد:') + ' ' + storeEmail);
            if (contactParts.length) {
                document.getElementById('invStoreContact').textContent = contactParts.join(' | ');
            }
        }

        async function loadInvoice() {
            await loadInvoiceStoreIdentity();
            const urlParams = new URLSearchParams(window.location.search);
            const clean = (val) => (val && val !== 'undefined' && val !== 'null') ? val.trim() : null;

            const orderId = clean(urlParams.get('id')) || clean(urlParams.get('orderId')) || clean(localStorage.getItem('lastOrderId'));
            const token = clean(urlParams.get('token')) || clean(localStorage.getItem('lastOrderToken')) || '';
            const phone = clean(urlParams.get('phone')) || clean(localStorage.getItem('lastOrderPhone')) || '';

            if (!orderId) {
                document.getElementById('invoiceItemsBody').innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--danger-color);">' + t('invoice.no_order_id', 'لم يتم تحديد رقم الطلب') + '</td></tr>';
                return;
            }

            try {
                let order = null;
                let items = [];

                // 1. Try full order API if tracking token is available
                if (token) {
                    try {
                        const tokenRes = await fetch(`/api/orders/${orderId}?token=${encodeURIComponent(token)}`, {
                            credentials: 'include',
                            headers: { 'X-Tracking-Token': token }
                        });
                        if (tokenRes.ok) {
                            const fullData = await tokenRes.json();
                            order = fullData;
                            items = fullData.items || [];
                        }
                    } catch (e) {}
                }

                // 2. If order not loaded and phone is present (e.g. from track-order page), fetch via tracking status API
                if (!order && phone) {
                    try {
                        const statusRes = await fetch(`/api/orders/status?orderId=${encodeURIComponent(orderId)}&phone=${encodeURIComponent(phone)}`);
                        if (statusRes.ok) {
                            const statusData = await statusRes.json();
                            order = statusData.order;
                            items = statusData.items || [];
                        }
                    } catch (e) {}
                }

                // 3. Fallback: try session credentials (logged in user or admin)
                if (!order) {
                    const authRes = await fetch(`/api/orders/${orderId}`, { credentials: 'include' });
                    if (!authRes.ok) {
                        const errData = await authRes.json().catch(() => ({}));
                        throw new Error(getSafeErrorMessage(errData, 'messages.load_invoice_error'));
                    }
                    order = await authRes.json();
                    items = order.items || [];
                }

                // Fill Meta
                document.getElementById('invNumber').textContent = `INV-${order.order_number || order.id}`;
                document.getElementById('invOrderNum').textContent = order.order_number || `#${order.id}`;
                document.getElementById('invDate').textContent = window.I18n ? window.I18n.formatDate(order.created_at || Date.now()) : new Date(order.created_at || Date.now()).toLocaleDateString();

                // Customer info
                document.getElementById('custName').textContent = order.shipping_full_name || t('product.store_customer', 'عميل المتجر');
                document.getElementById('custPhone').textContent = order.phone || phone || '-';
                document.getElementById('custEmail').textContent = order.email || '-';
                document.getElementById('custWilaya').textContent = order.wilaya_name || order.city || t('wilayas.algiers', 'الجزائر');
                document.getElementById('custAddress').textContent = order.address || '-';
                document.getElementById('custDeliveryType').textContent = order.delivery_type === 'desk' ? t('invoice.desk_pickup', 'استلام من مكتب التوصيل') : t('invoice.home_delivery', 'توصيل للمنزل');

                // Payment info
                document.getElementById('invPayMethod').textContent = order.payment_method === 'chargily' ? t('conf.epay', 'دفع إلكتروني (بطاقة ذهبية / CIB)') : t('features.cod_title', 'الدفع عند الاستلام') + ' (COD)';
                document.getElementById('invPayStatus').style.color = order.payment_status === 'paid' ? '#15803d' : '#b45309';
                document.getElementById('invPayStatus').textContent = order.payment_status === 'paid' ? t('invoice.status_paid', 'مدفوع إلكترونياً بالكامل ✅') : t('invoice.status_unpaid', 'قيد التحصيل نقداً عند الاستلام 📦');

                // Items list
                if (!items || !items.length) {
                    items = order.items || [];
                }
                const tbody = document.getElementById('invoiceItemsBody');
                let subtotal = 0;

                tbody.innerHTML = items.map((item, index) => {
                    const lineTotal = Number(item.price) * Number(item.quantity);
                    subtotal += lineTotal;
                    const safeName = window.escapeHtml ? window.escapeHtml(item.name) : item.name;
                    return `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${safeName}</td>
                            <td style="text-align: center;">${item.quantity}</td>
                            <td style="text-align: left;">${window.I18n ? window.I18n.formatNumber(item.price) : Number(item.price).toLocaleString()} ${t('common.currency', 'دج')}</td>
                            <td>${window.I18n ? window.I18n.formatNumber(lineTotal) : lineTotal.toLocaleString()} ${t('common.currency', 'دج')}</td>
                        </tr>
                    `;
                }).join('');

                const shippingCost = Number(order.shipping_cost || 0);
                const grandTotal = Number(order.total || (subtotal + shippingCost));
                const discount = Math.max(0, subtotal + shippingCost - grandTotal);

                document.getElementById('invSubtotal').textContent = `${window.I18n ? window.I18n.formatNumber(subtotal) : subtotal.toLocaleString()} ${t('common.currency', 'دج')}`;
                document.getElementById('invShipping').textContent = `${window.I18n ? window.I18n.formatNumber(shippingCost) : shippingCost.toLocaleString()} ${t('common.currency', 'دج')}`;
                document.getElementById('invGrandTotal').textContent = `${window.I18n ? window.I18n.formatNumber(grandTotal) : grandTotal.toLocaleString()} ${t('common.currency', 'دج')}`;

                const discRow = document.getElementById('invDiscountRow');
                const discEl = document.getElementById('invDiscount');
                if (discount > 0 && discRow && discEl) {
                    discRow.style.display = 'table-row';
                    discEl.textContent = `-${window.I18n ? window.I18n.formatNumber(discount) : discount.toLocaleString()} ${t('common.currency', 'دج')}`;
                }

                // Set track link
                const custPhone = clean(order.phone) || clean(phone) || '';
                const phoneTrackParam = custPhone ? `&phone=${encodeURIComponent(custPhone)}` : '';
                document.getElementById('trackLinkBtn').href = `track-order.html?orderId=${order.id}${phoneTrackParam}`;

                if (window.I18n && typeof window.I18n.translatePage === 'function') {
                    window.I18n.translatePage();
                }
            } catch (err) {
                console.error('Invoice error:', err);
                const tbody = document.getElementById('invoiceItemsBody');
                if (tbody) {
                    const errorText = getSafeErrorMessage(err, 'messages.load_invoice_error');
                    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--danger-color);">${t('messages.load_invoice_error', 'تعذر تحميل بيانات الفاتورة')}: ${window.escapeHtml ? window.escapeHtml(errorText) : errorText}</td></tr>`;
                }
                const subEl = document.getElementById('invSubtotal');
                const shipEl = document.getElementById('invShipping');
                const grandEl = document.getElementById('invGrandTotal');
                if (subEl) subEl.textContent = '-';
                if (shipEl) shipEl.textContent = '-';
                if (grandEl) grandEl.textContent = '-';
            }
        }

        document.addEventListener('DOMContentLoaded', loadInvoice);
    

// Event Delegation
function windowPrint() {
    window.print();
}
window.windowPrint = windowPrint;

document.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    if (action === 'windowPrint') {
        e.preventDefault();
        window.print();
    }
});


// Capture image load errors
document.addEventListener('error', function(e) {
    if (e.target && e.target.tagName && e.target.tagName.toLowerCase() === 'img') {
        if (e.target.src !== window.location.origin + '/images/product-placeholder.jpg') {
            e.target.onerror = null;
            e.target.src = '/images/product-placeholder.jpg';
        }
    }
}, true);

// Expose functions to window
window.loadInvoiceStoreIdentity = loadInvoiceStoreIdentity;
window.loadInvoice = loadInvoice;
window.t = t;
