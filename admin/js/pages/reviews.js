        let currentPage = 1;
        let totalPages = 1;

        document.addEventListener('DOMContentLoaded', async () => {
            const user = await AdminAuth.verifyAdmin();
            if (!user) return;

            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.addEventListener('input', AdminTable.debounce(() => loadAdminReviews(1), 300));
            }
            document.getElementById('statusFilter').addEventListener('change', () => loadAdminReviews(1));

            loadAdminReviews(1);
        });

        async function loadAdminReviews(page = 1) {
            currentPage = page;
            const search = (document.getElementById('searchInput').value || '').trim();
            const status = document.getElementById('statusFilter').value;
            const headers = AdminAuth.getHeaders(false);

            let url = `/api/admin/reviews?page=${page}&limit=15&status=${status}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;

            try {
                const res = await fetch(url, { credentials: 'include', headers });
                if (!res.ok) throw new Error('فشل جلب التقييمات');
                const data = await res.json();

                const reviews = data.reviews || [];
                totalPages = data.totalPages || 1;
                document.getElementById('reviewsCountDisplay').textContent = `إجمالي التقييمات: ${data.total || reviews.length}`;

                renderReviewsTable(reviews);
                renderPagination(currentPage, totalPages);
            } catch (err) {
                const tbody = document.getElementById('reviews-tbody');
                tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red; padding: 20px;">خطأ: ${AdminTable.escapeHtml(err.message)}</td></tr>`;
            }
        }

        function renderReviewsTable(reviews) {
            const tbody = document.getElementById('reviews-tbody');
            if (!reviews || !reviews.length) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--light-text, #64748b);">لا توجد تقييمات مطابقة</td></tr>';
                return;
            }

            const statusLabels = { 'approved': 'موافق عليه ✅', 'pending': 'قيد المراجعة ⏳', 'rejected': 'مرفوض ❌' };

            tbody.innerHTML = reviews.map(r => {
                const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
                return `
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 12px 15px; font-weight: bold;">${r.id}</td>
                        <td style="padding: 12px 15px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <img src="${r.productImage || '../images/product-placeholder.jpg'}" style="width: 36px; height: 36px; border-radius: 4px; object-fit: cover;">
                                <strong>${AdminTable.escapeHtml(r.productName)}</strong>
                            </div>
                        </td>
                        <td style="padding: 12px 15px;">
                            <strong>${AdminTable.escapeHtml(r.username)}</strong>
                            <div style="font-size: 0.8rem; color: var(--light-text, #64748b);">${AdminTable.escapeHtml(r.email || '')}</div>
                        </td>
                        <td style="padding: 12px 15px; text-align: center; font-size: 1.1rem;" class="stars-gold">${stars}</td>
                        <td style="padding: 12px 15px; max-width: 250px; font-size: 0.9rem; color: var(--text-color, #334155);">${AdminTable.escapeHtml(r.comment) || '<span class="text-slate-light">بدون تعليق نصي</span>'}</td>
                        <td style="padding: 12px 15px; text-align: center; color: var(--light-text, #64748b); font-size: 0.85rem;">${new Date(r.created_at).toLocaleDateString('ar-DZ')}</td>
                        <td style="padding: 12px 15px; text-align: center;"><span class="status-badge status-${r.status}">${statusLabels[r.status] || r.status}</span></td>
                        <td style="padding: 12px 15px; text-align: center;">
                            ${r.status !== 'approved' ? `<button type="button" class="review-action-btn approve-btn" data-action="updateReviewStatus" data-args="${r.id}, 'approved'" title="الموافقة على النشر"><i class="fas fa-check"></i></button>` : ''}
                            ${r.status !== 'rejected' ? `<button type="button" class="review-action-btn reject-btn" data-action="updateReviewStatus" data-args="${r.id}, 'rejected'" title="رفض وحجب"><i class="fas fa-ban"></i></button>` : ''}
                            <button type="button" class="review-action-btn delete-btn" data-action="deleteReview" data-args="${r.id}" title="حذف نهائي"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        function renderPagination(current, total) {
            const container = document.getElementById('pagination');
            if (total <= 1) { container.innerHTML = ''; return; }
            let html = '';
            for (let i = 1; i <= total; i++) {
                html += `<button type="button" class="page-btn${i === current ? ' active' : ''}" data-action="loadAdminReviews" data-args="${i}">${i}</button>`;
            }
            container.innerHTML = html;
        }

        async function updateReviewStatus(id, newStatus) {
            try {
                const headers = AdminAuth.getHeaders(true);
                const res = await fetch(`/api/admin/reviews/${id}/status`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers,
                    body: JSON.stringify({ status: newStatus })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'فشل تحديث الحالة');
                AdminUI.showToast('تم تحديث حالة التقييم بنجاح', 'success');
                loadAdminReviews(currentPage);
            } catch (err) {
                AdminUI.showToast('خطأ: ' + err.message, 'error');
            }
        }

        async function deleteReview(id) {
            const confirmed = await AdminUI.confirm('هل أنت متأكد من رغبتك في حذف هذا التقييم نهائياً؟', 'حذف التقييم');
            if (!confirmed) return;

            try {
                const headers = AdminAuth.getHeaders(false);
                const res = await fetch(`/api/admin/reviews/${id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'فشل حذف التقييم');
                AdminUI.showToast('تم حذف التقييم بنجاح', 'success');
                loadAdminReviews(currentPage);
            } catch (err) {
                AdminUI.showToast('خطأ: ' + err.message, 'error');
            }
        }
    
