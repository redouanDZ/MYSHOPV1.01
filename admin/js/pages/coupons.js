        document.addEventListener('DOMContentLoaded', async () => {
            const user = await AdminAuth.verifyAdmin();
            if (!user) return;

            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.addEventListener('input', AdminTable.debounce(loadAdminCoupons, 300));
                searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        loadAdminCoupons();
                    }
                });
            }
            document.getElementById('statusFilter').addEventListener('change', loadAdminCoupons);

            loadAdminCoupons();
        });

        async function loadAdminCoupons() {
            const search = (document.getElementById('searchInput').value || '').trim();
            const status = document.getElementById('statusFilter').value;
            const headers = AdminAuth.getHeaders(false);

            let url = `/api/admin/coupons?status=${status}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;

            try {
                const res = await fetch(url, { credentials: 'include', headers });
                if (!res.ok) throw new Error('فشل جلب القسائم');
                const coupons = await res.json();

                renderCouponsTable(coupons);
            } catch (err) {
                const tbody = document.getElementById('coupons-tbody');
                tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red; padding: 20px;">خطأ: ${AdminTable.escapeHtml(err.message)}</td></tr>`;
            }
        }

        let currentCoupons = [];

        function renderCouponsTable(coupons) {
            currentCoupons = coupons || [];
            const tbody = document.getElementById('coupons-tbody');
            if (!coupons || !coupons.length) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--light-text, #64748b);">لا توجد قسائم خصم مضافة بعد</td></tr>';
                return;
            }

            tbody.innerHTML = coupons.map(c => {
                const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
                const displayStatus = isExpired ? 'expired' : c.status;
                const statusLabels = { 'active': 'نشط', 'inactive': 'غير نشط', 'expired': 'منتهي' };
                const discountText = c.discount_percent > 0 ? `${c.discount_percent}%` : `${Number(c.discount_amount).toLocaleString()} دج`;

                return `
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td data-label="#" style="padding: 12px 15px; font-weight: bold;">${c.id}</td>
                        <td data-label="رمز الكوبون" style="padding: 12px 15px; font-weight: bold; color: var(--primary-color); font-size: 1.05rem;">${AdminTable.escapeHtml(c.code)}</td>
                        <td data-label="قيمة الخصم" style="padding: 12px 15px; font-weight: bold; color: var(--success-color);">${discountText}</td>
                        <td data-label="الحد الأدنى" style="padding: 12px 15px;">${Number(c.min_order_amount) > 0 ? Number(c.min_order_amount).toLocaleString() + ' دج' : 'بدون حد'}</td>
                        <td data-label="الاستخدامات" style="padding: 12px 15px; text-align: center;"><strong>${c.uses_count}</strong> / ${c.max_uses}</td>
                        <td data-label="تاريخ الانتهاء" style="padding: 12px 15px; text-align: center; color: var(--light-text, #64748b); font-size: 0.9rem;">${c.expires_at ? new Date(c.expires_at).toLocaleDateString('ar-DZ') : 'دائم'}</td>
                        <td data-label="الحالة" style="padding: 12px 15px; text-align: center;"><span class="status-badge status-${displayStatus}">${statusLabels[displayStatus] || displayStatus}</span></td>
                        <td data-label="إجراءات" style="padding: 12px 15px; text-align: center;">
                            <button type="button" class="coupon-action-btn" data-action="openEditCouponModal" data-args="${c.id}" title="تعديل الكوبون"><i class="fas fa-edit"></i></button>
                            <button type="button" class="coupon-action-btn toggle-btn" data-action="toggleCouponStatus" data-args="${c.id}, '${c.status === 'active' ? 'inactive' : 'active'}'" title="${c.status === 'active' ? 'تعطيل الكوبون' : 'تفعيل الكوبون'}"><i class="fas fa-power-off"></i></button>
                            <button type="button" class="coupon-action-btn delete-btn" data-action="deleteCoupon" data-args="${c.id}" title="حذف الكوبون"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        let editingCouponId = null;

        function openAddCouponModal() {
            editingCouponId = null;
            document.getElementById('modalCouponTitle').textContent = 'إضافة قسيمة خصم جديدة';
            document.getElementById('couponForm').reset();
            document.getElementById('couponCode').disabled = false;
            document.getElementById('couponModal').style.display = 'block';
        }

        function openEditCouponModal(couponOrId) {
            const coupon = typeof couponOrId === 'object' && couponOrId !== null ? couponOrId : (currentCoupons || []).find(c => c.id === couponOrId);
            if (!coupon) return;
            editingCouponId = coupon.id;
            document.getElementById('modalCouponTitle').textContent = `تعديل قسيمة الخصم #${coupon.id}`;
            document.getElementById('couponCode').value = coupon.code;
            document.getElementById('couponCode').disabled = true;
            document.getElementById('couponPercent').value = coupon.discount_percent || '';
            document.getElementById('couponAmount').value = coupon.discount_amount || '';
            document.getElementById('couponMinOrder').value = coupon.min_order_amount || 0;
            document.getElementById('couponMaxUses').value = coupon.max_uses || 100;
            document.getElementById('couponExpiry').value = coupon.expires_at ? coupon.expires_at.split('T')[0] : '';
            document.getElementById('couponStatus').value = coupon.status || 'active';
            document.getElementById('couponModal').style.display = 'block';
        }

        function closeCouponModal() {
            document.getElementById('couponModal').style.display = 'none';
        }

        async function handleSaveCoupon(e) {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const code = document.getElementById('couponCode').value.trim().toUpperCase();
            const discountPercent = parseFloat(document.getElementById('couponPercent').value) || 0;
            const discountAmount = parseFloat(document.getElementById('couponAmount').value) || 0;
            const minOrderAmount = parseFloat(document.getElementById('couponMinOrder').value) || 0;
            const maxUses = parseInt(document.getElementById('couponMaxUses').value, 10) || 100;
            const expiresAt = document.getElementById('couponExpiry').value || null;
            const status = document.getElementById('couponStatus').value;

            if (!code) { AdminUI.showToast('رمز الكوبون مطلوب', 'warning'); return; }
            if (discountPercent <= 0 && discountAmount <= 0) {
                AdminUI.showToast('يرجى تحديد نسبة الخصم أو قيمة الخصم الثابت', 'warning');
                return;
            }

            AdminUI.setButtonLoading(submitBtn, true, editingCouponId ? 'جاري التحديث...' : 'جاري الحفظ...');

            try {
                const headers = AdminAuth.getHeaders(true);
                let res;
                if (editingCouponId) {
                    res = await fetch(`/api/admin/coupons/${editingCouponId}`, {
                        method: 'PUT',
                        credentials: 'include',
                        headers,
                        body: JSON.stringify({
                            discountPercent,
                            discountAmount,
                            minOrderAmount,
                            maxUses,
                            expiresAt,
                            status
                        })
                    });
                } else {
                    res = await fetch('/api/admin/coupons', {
                        method: 'POST',
                        credentials: 'include',
                        headers,
                        body: JSON.stringify({
                            code,
                            discountPercent,
                            discountAmount,
                            minOrderAmount,
                            maxUses,
                            expiresAt,
                            status
                        })
                    });
                }

                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'فشل حفظ الكوبون');

                AdminUI.showToast(editingCouponId ? 'تم تحديث قسيمة الخصم بنجاح! 🎉' : 'تم إنشاء قسيمة الخصم بنجاح! 🎉', 'success');
                closeCouponModal();
                loadAdminCoupons();
            } catch (err) {
                AdminUI.showToast('خطأ: ' + err.message, 'error');
            } finally {
                AdminUI.setButtonLoading(submitBtn, false);
            }
        }

        async function toggleCouponStatus(id, newStatus) {
            try {
                const headers = AdminAuth.getHeaders(true);
                const res = await fetch(`/api/admin/coupons/${id}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers,
                    body: JSON.stringify({ status: newStatus })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'فشل تحديث الحالة');
                AdminUI.showToast('تم تحديث حالة الكوبون بنجاح', 'success');
                loadAdminCoupons();
            } catch (err) {
                AdminUI.showToast('خطأ: ' + err.message, 'error');
            }
        }

        async function deleteCoupon(id) {
            const confirmed = await AdminUI.confirm('هل أنت متأكد من رغبتك في حذف هذا الكوبون؟', 'حذف الكوبون');
            if (!confirmed) return;

            try {
                const headers = AdminAuth.getHeaders(false);
                const res = await fetch(`/api/admin/coupons/${id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'فشل حذف الكوبون');
                AdminUI.showToast('تم حذف الكوبون بنجاح', 'success');
                loadAdminCoupons();
            } catch (err) {
                AdminUI.showToast('خطأ: ' + err.message, 'error');
            }
        }

        function resetCouponsFilters() {
            const searchInput = document.getElementById('searchInput');
            const statusFilter = document.getElementById('statusFilter');
            if (searchInput) searchInput.value = '';
            if (statusFilter) statusFilter.value = 'all';
            loadAdminCoupons();
        }

// Expose admin coupon functions globally for data-action delegation
window.loadAdminCoupons = loadAdminCoupons;
window.resetCouponsFilters = resetCouponsFilters;
window.openAddCouponModal = openAddCouponModal;
window.openEditCouponModal = openEditCouponModal;
window.closeCouponModal = closeCouponModal;
window.saveCoupon = saveCoupon;
window.deleteCoupon = deleteCoupon;
