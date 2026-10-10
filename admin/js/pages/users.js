        let currentPage = 1;
        let totalPages = 1;

        document.addEventListener('DOMContentLoaded', async () => {
            const user = await AdminAuth.verifyAdmin();
            if (!user) return;

            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.addEventListener('input', AdminTable.debounce(() => loadAdminCustomers(1), 300));
                searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        loadAdminCustomers(1);
                    }
                });
            }
            const roleFilter = document.getElementById('roleFilter');
            if (roleFilter) {
                roleFilter.addEventListener('change', () => loadAdminCustomers(1));
            }

            loadAdminCustomers(1);
        });

        async function loadAdminCustomers(page = 1) {
            currentPage = page;
            const search = (document.getElementById('searchInput')?.value || '').trim();
            const role = document.getElementById('roleFilter')?.value || 'all';
            const headers = AdminAuth.getHeaders(false);

            let url = `/api/admin/users?page=${page}&limit=15`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (role && role !== 'all') url += `&role=${encodeURIComponent(role)}`;

            try {
                const res = await fetch(url, { credentials: 'include', headers });
                if (!res.ok) throw new Error('فشل جلب العملاء');
                const data = await res.json();

                const customers = data.users || [];
                totalPages = data.totalPages || 1;
                document.getElementById('customersCountDisplay').textContent = `إجمالي المسجلين: ${data.total || customers.length}`;

                renderCustomersTable(customers);
                renderPagination(currentPage, totalPages);
            } catch (err) {
                const tbody = document.getElementById('customers-tbody');
                tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: red; padding: 20px;">خطأ: ${AdminTable.escapeHtml(err.message)}</td></tr>`;
            }
        }

        function renderCustomersTable(customers) {
            const tbody = document.getElementById('customers-tbody');
            if (!customers.length) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 30px; color: var(--light-text, #64748b);">لا يوجد عملاء مطابقون للبحث</td></tr>';
                return;
            }

            tbody.innerHTML = customers.map(c => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td data-label="#" style="padding: 12px 15px; font-weight: bold;">${c.id}</td>
                    <td data-label="الاسم" style="padding: 12px 15px; font-weight: bold; color: var(--text-color, #1e293b);">${AdminTable.escapeHtml(c.username)}</td>
                    <td data-label="البريد الإلكتروني" style="padding: 12px 15px; color: var(--light-text, #64748b);">${AdminTable.escapeHtml(c.email)}</td>
                    <td data-label="الهاتف" style="padding: 12px 15px; color: var(--text-color, #334155);">${AdminTable.escapeHtml(c.phone || '-')}</td>
                    <td data-label="نوع الحساب" style="padding: 12px 15px;"><span class="role-badge ${c.role === 'admin' ? 'role-admin' : 'role-customer'}">${c.role === 'admin' ? 'مدير' : 'عميل'}</span></td>
                    <td data-label="الطلبات" style="padding: 12px 15px; text-align: center; font-weight: bold;">${c.orders_count || 0}</td>
                    <td data-label="إجمالي المشتريات" style="padding: 12px 15px; text-align: left; font-weight: bold; color: var(--success-color);">${Number(c.total_spent || 0).toLocaleString()} دج</td>
                    <td data-label="تاريخ التسجيل" style="padding: 12px 15px; text-align: center; color: var(--light-text, #64748b); font-size: 0.9rem;">${new Date(c.created_at).toLocaleDateString('ar-DZ')}</td>
                    <td data-label="إجراءات" style="padding: 12px 15px; text-align: center;">
                        <button type="button" class="customer-action-btn" data-action="viewCustomerDetails" data-args="${c.id}" title="عرض التفاصيل"><i class="fas fa-eye"></i></button>
                    </td>
                </tr>
            `).join('');
        }

        function renderPagination(current, total) {
            const container = document.getElementById('pagination');
            if (total <= 1) { container.innerHTML = ''; return; }
            let html = '';
            for (let i = 1; i <= total; i++) {
                html += `<button type="button" class="page-btn${i === current ? ' active' : ''}" data-action="loadAdminCustomers" data-args="${i}">${i}</button>`;
            }
            container.innerHTML = html;
        }

        async function viewCustomerDetails(userId) {
            const modal = document.getElementById('customerModal');
            const body = document.getElementById('modalCustomerBody');
            modal.style.display = 'block';
            body.innerHTML = '<p style="text-align:center; color: var(--light-text); padding: 20px;"><i class="fas fa-spinner fa-spin"></i> جاري تحميل بيانات المستخدم...</p>';

            try {
                const headers = AdminAuth.getHeaders(false);
                const res = await fetch(`/api/admin/users/${userId}`, { credentials: 'include', headers });
                if (!res.ok) throw new Error('فشل جلب تفاصيل المستخدم');
                const user = await res.json();

                document.getElementById('modalCustomerName').textContent = `ملف العميل: ${user.username}`;
                const addresses = user.addresses || [];
                const orders = user.orders || [];

                body.innerHTML = `
                    <div class="info-box" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 0.95rem;">
                        <div>
                            <p style="margin: 4px 0;"><strong>الاسم:</strong> ${AdminTable.escapeHtml(user.username)}</p>
                            <p style="margin: 4px 0;"><strong>البريد:</strong> ${AdminTable.escapeHtml(user.email)}</p>
                            <p style="margin: 4px 0;"><strong>الهاتف:</strong> ${AdminTable.escapeHtml(user.phone || '-')}</p>
                        </div>
                        <div>
                            <p style="margin: 4px 0;"><strong>الدور:</strong> ${AdminTable.escapeHtml(user.role)}</p>
                            <p style="margin: 4px 0;"><strong>تاريخ التسجيل:</strong> ${new Date(user.created_at).toLocaleDateString('ar-DZ')}</p>
                        </div>
                    </div>

                    <h4 style="margin-bottom: 8px;">العناوين المسجلة (${addresses.length})</h4>
                    <div style="margin-bottom: 20px;">
                        ${addresses.length ? addresses.map(a => `<div class="address-card"><strong>${AdminTable.escapeHtml(a.title)}:</strong> ${AdminTable.escapeHtml(a.city)} - ${AdminTable.escapeHtml(a.address)} (${AdminTable.escapeHtml(a.phone)})</div>`).join('') : '<p class="text-slate sm-text">لا توجد عناوين مسجلة</p>'}
                    </div>

                    <h4 style="margin-bottom: 8px;">سجل الطلبات (${orders.length})</h4>
                    <div>
                        ${orders.length ? `
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                                <thead>
                                    <tr class="table-alt-row">
                                        <th style="padding: 6px 10px;">رقم الطلب</th>
                                        <th style="padding: 6px 10px;">التاريخ</th>
                                        <th style="padding: 6px 10px;">الإجمالي</th>
                                        <th style="padding: 6px 10px;">الحالة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${orders.map(o => `
                                        <tr style="border-bottom: 1px solid var(--border-color);">
                                            <td style="padding: 6px 10px; font-weight: bold;">${AdminTable.escapeHtml(o.order_number || '#' + o.id)}</td>
                                            <td style="padding: 6px 10px;">${new Date(o.created_at).toLocaleDateString('ar-DZ')}</td>
                                            <td style="padding: 6px 10px; font-weight: bold; color: var(--success-color);">${Number(o.total).toLocaleString()} دج</td>
                                            <td style="padding: 6px 10px;">${AdminTable.escapeHtml(o.status)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : '<p class="text-slate sm-text">لم يقم العميل بإجراء أي طلبات حتى الآن</p>'}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 15px; margin-top: 20px; flex-wrap: wrap; gap: 10px;">
                        <div style="display: flex; gap: 8px;">
                            ${user.role === 'customer' ? `
                                <button type="button" data-action="changeUserRole" data-args="${user.id}, 'admin'" class="btn btn-primary btn-sm">
                                    <i class="fas fa-user-shield"></i> ترقية إلى مدير
                                </button>
                            ` : `
                                <button type="button" data-action="changeUserRole" data-args="${user.id}, 'customer'" class="btn btn-secondary btn-sm">
                                    <i class="fas fa-user"></i> تحويل إلى عميل عادي
                                </button>
                            `}
                            <button type="button" data-action="deleteUserAccount" data-args="${user.id}" class="btn btn-danger btn-sm">
                                <i class="fas fa-trash"></i> حذف الحساب
                            </button>
                        </div>
                        <button type="button" data-action="closeCustomerModal" data-args="" class="btn btn-outline">إغلاق</button>
                    </div>
                `;
            } catch (err) {
                body.innerHTML = `<p class="text-danger error-padding">خطأ: ${AdminTable.escapeHtml(err.message)}</p>`;
            }
        }

        async function changeUserRole(userId, newRole) {
            const roleName = newRole === 'admin' ? 'مدير' : 'عميل عادي';
            const confirmed = await AdminUI.confirm(`هل أنت متأكد من تغيير دور هذا المستخدم إلى "${roleName}"؟`, 'تعديل صلاحيات المستخدم');
            if (!confirmed) return;

            try {
                const headers = AdminAuth.getHeaders(true);
                const res = await fetch(`/api/admin/users/${userId}/role`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers,
                    body: JSON.stringify({ role: newRole })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'فشل تحديث الدور');

                AdminUI.showToast('تم تحديث دور المستخدم بنجاح', 'success');
                closeCustomerModal();
                loadAdminCustomers(currentPage);
            } catch (err) {
                AdminUI.showToast(err.message, 'error');
            }
        }

        async function deleteUserAccount(userId) {
            const confirmed = await AdminUI.confirm('هل أنت متأكد من رغبتك في حذف هذا الحساب نهائياً؟', 'حذف حساب المستخدم');
            if (!confirmed) return;

            try {
                const headers = AdminAuth.getHeaders(false);
                const res = await fetch(`/api/admin/users/${userId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'فشل حذف الحساب');

                AdminUI.showToast('تم حذف الحساب بنجاح', 'success');
                closeCustomerModal();
                loadAdminCustomers(currentPage);
            } catch (err) {
                AdminUI.showToast(err.message, 'error');
            }
        }

        function closeCustomerModal() {
            document.getElementById('customerModal').style.display = 'none';
        }

        function resetUsersFilters() {
            const searchInput = document.getElementById('searchInput');
            const roleFilter = document.getElementById('roleFilter');
            if (searchInput) searchInput.value = '';
            if (roleFilter) roleFilter.value = 'all';
            loadAdminCustomers(1);
        }

// Expose admin customer functions globally for data-action delegation
window.loadAdminCustomers = loadAdminCustomers;
window.resetUsersFilters = resetUsersFilters;
window.viewCustomerDetails = viewCustomerDetails;
window.closeCustomerModal = closeCustomerModal;
window.changeUserRole = changeUserRole;
window.changeUserStatus = changeUserStatus;
window.deleteUserAccount = deleteUserAccount;
    
