/**
 * MYSHOP Admin Dashboard Centralized Architecture
 * Unifies Security Guards, Shared Utilities, UI Notifications & Modals
 */

const AdminAuth = {
    csrfToken: null,

    getCsrfToken() {
        if (this.csrfToken) return this.csrfToken;
        const cookieMatch = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
        if (cookieMatch) {
            this.csrfToken = decodeURIComponent(cookieMatch[1]);
            return this.csrfToken;
        }
        return '';
    },

    async fetchCsrfToken() {
        try {
            const res = await fetch('/api/csrf-token', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (data && data.csrfToken) {
                    this.csrfToken = data.csrfToken;
                    return this.csrfToken;
                }
            }
        } catch (e) {}
        return this.getCsrfToken();
    },

    getHeaders(isJson = true) {
        const headers = {};
        if (isJson) {
            headers['Content-Type'] = 'application/json';
        }
        const token = this.getCsrfToken();
        if (token) {
            headers['X-CSRF-Token'] = token;
        }
        return headers;
    },

    async verifyAdmin() {
        try {
            await this.fetchCsrfToken();
            const res = await fetch('/api/user/profile', {
                credentials: 'include',
                headers: this.getHeaders(false)
            });

            if (!res.ok) {
                throw new Error('Unauthorized');
            }

            const user = await res.json();
            if (!user || user.role !== 'admin') {
                this.clearAuth();
                window.location.href = '../index.html';
                return null;
            }

            const userTag = document.getElementById('adminUserTag');
            if (userTag) {
                userTag.textContent = user.username || 'مدير النظام';
            }

            return user;
        } catch (e) {
            this.clearAuth();
            window.location.href = '../index.html';
            return null;
        }
    },

    clearAuth() {
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
    },

    async logout() {
        const confirmed = await AdminUI.confirm('هل ترغب في تسجيل الخروج من لوحة الإدارة؟', 'تسجيل الخروج');
        if (!confirmed) return;

        try {
            await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include',
                headers: this.getHeaders(true)
            }).catch(() => {});
        } catch (e) {}

        this.clearAuth();
        window.location.href = '../index.html';
    }
};

const AdminUI = {
    init() {
        this.fetchStoreName();
        this.initTheme();
        this.initThemeToggle();
        this.initMobileNav();
        this.initLogoutHandler();
        this.translateInterface();
    },

    async fetchStoreName() {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                if (data && data.store_name) {
                    const logos = document.querySelectorAll('.logo a');
                    logos.forEach(logo => {
                        logo.textContent = data.store_name;
                    });
                }
            }
        } catch(e) {}
    },

    initTheme() {
        const currentTheme = localStorage.getItem('theme') ||
            (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', currentTheme);
    },

    initThemeToggle() {
        const containers = document.querySelectorAll('.user-actions');
        containers.forEach(container => {
            if (container.querySelector('.admin-theme-toggle')) return;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'admin-theme-toggle';
            button.addEventListener('click', () => {
                const nextTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', nextTheme);
                localStorage.setItem('theme', nextTheme);
                this.updateThemeToggle(button);
            });
            container.insertBefore(button, container.firstChild);
            this.updateThemeToggle(button);
        });
    },

    updateThemeToggle(button) {
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        button.innerHTML = `<i class="fas ${dark ? 'fa-sun' : 'fa-moon'}"></i>`;
        button.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
        button.setAttribute('aria-label', button.title);
    },

    translateInterface() {
        const lang = localStorage.getItem('myshop_lang') || 'ar';
        if (lang === 'ar') return;

        const translations = {
            fr: {
                'المتجر الإلكتروني': 'Boutique en ligne',
                'زيارة المتجر': 'Visiter la boutique',
                'لوحة التحكم': 'Tableau de bord',
                'الطلبات': 'Commandes',
                'المنتجات': 'Produits',
                'العملاء': 'Clients',
                'الكوبونات': 'Coupons',
                'التقييمات': 'Avis',
                'الإعدادات': 'Paramètres',
                'التوثيق': 'Documentation',
                'لوحة الإدارة': 'Administration',
                'مدير النظام': 'Administrateur',
                'الإحصائيات العامة': 'Vue d’ensemble',
                'إدارة الطلبات': 'Gestion des commandes',
                'المنتجات والمخزون': 'Produits et stock',
                'إدارة المستخدمين': 'Gestion des utilisateurs',
                'قسائم الخصم': 'Coupons de réduction',
                'تقييمات المنتجات': 'Avis produits',
                'الإعدادات والبكسلات': 'Paramètres et pixels',
                'واجهة المتجر': 'Boutique',
                'تسجيل الخروج': 'Déconnexion',
                'نظرة عامة على المبيعات والمخزون': 'Vue d’ensemble des ventes et du stock',
                'إجمالي المبيعات المحققة': 'Chiffre d’affaires total',
                'صافي الأرباح التقديرية 📈': 'Bénéfice net estimé 📈',
                'إجمالي عدد الطلبات': 'Nombre total de commandes',
                'طلبات جديدة قيد المعالجة': 'Nouvelles commandes en traitement',
                'تنبيه: منتجات قاربت على النفاد': 'Alerte : stock faible',
                'إدارة المنتجات والمخزون': 'Gestion des produits et du stock',
                'إضافة منتج جديد': 'Ajouter un produit',
                'إدارة الأقسام': 'Gérer les catégories',
                'بحث باسم المنتج أو الوصف...': 'Rechercher par nom ou description...',
                'جميع التصنيفات': 'Toutes les catégories',
                'جميع حالات المخزون': 'Tous les états du stock',
                'متوفر في المخزون': 'En stock',
                'مخزون منخفض (1-3)': 'Stock faible (1-3)',
                'نفد المخزون (0)': 'Rupture de stock (0)',
                'جاري الحفظ...': 'Enregistrement...'
            },
            en: {
                'المتجر الإلكتروني': 'Online Store',
                'زيارة المتجر': 'Visit Store',
                'لوحة التحكم': 'Dashboard',
                'الطلبات': 'Orders',
                'المنتجات': 'Products',
                'العملاء': 'Customers',
                'الكوبونات': 'Coupons',
                'التقييمات': 'Reviews',
                'الإعدادات': 'Settings',
                'التوثيق': 'Documentation',
                'لوحة الإدارة': 'Admin Panel',
                'مدير النظام': 'Administrator',
                'الإحصائيات العامة': 'Overview',
                'إدارة الطلبات': 'Order Management',
                'المنتجات والمخزون': 'Products & Inventory',
                'إدارة المستخدمين': 'User Management',
                'قسائم الخصم': 'Discount Coupons',
                'تقييمات المنتجات': 'Product Reviews',
                'الإعدادات والبكسلات': 'Settings & Pixels',
                'واجهة المتجر': 'Storefront',
                'تسجيل الخروج': 'Log out',
                'نظرة عامة على المبيعات والمخزون': 'Sales and Inventory Overview',
                'إجمالي المبيعات المحققة': 'Total Revenue',
                'صافي الأرباح التقديرية 📈': 'Estimated Net Profit 📈',
                'إجمالي عدد الطلبات': 'Total Orders',
                'طلبات جديدة قيد المعالجة': 'New Orders Processing',
                'تنبيه: منتجات قاربت على النفاد': 'Low Stock Alert',
                'إدارة المنتجات والمخزون': 'Product & Inventory Management',
                'إضافة منتج جديد': 'Add New Product',
                'إدارة الأقسام': 'Manage Categories',
                'بحث باسم المنتج أو الوصف...': 'Search by product name or description...',
                'جميع التصنيفات': 'All Categories',
                'جميع حالات المخزون': 'All Stock Statuses',
                'متوفر في المخزون': 'In Stock',
                'مخزون منخفض (1-3)': 'Low Stock (1-3)',
                'نفد المخزون (0)': 'Out of Stock (0)',
                'جاري الحفظ...': 'Saving...'
            }
        };
        const dictionary = translations[lang] || translations.en;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(node => {
            const value = node.nodeValue.trim();
            if (dictionary[value]) node.nodeValue = node.nodeValue.replace(value, dictionary[value]);
        });
        document.querySelectorAll('[placeholder], [title], [aria-label]').forEach(element => {
            ['placeholder', 'title', 'aria-label'].forEach(attribute => {
                const value = element.getAttribute(attribute);
                if (value && dictionary[value]) element.setAttribute(attribute, dictionary[value]);
            });
        });
        document.documentElement.lang = lang;
        document.documentElement.dir = 'ltr';
    },

    initMobileNav() {
        const sidebar = document.querySelector('.sidebar');
        const dashboardHeader = document.querySelector('.dashboard-header, .page-header');
        if (!sidebar || !dashboardHeader) return;

        // Add toggle button if not exists
        let toggleBtn = document.getElementById('adminSidebarToggle');
        if (!toggleBtn) {
            toggleBtn = document.createElement('button');
            toggleBtn.id = 'adminSidebarToggle';
            toggleBtn.className = 'admin-menu-toggle';
            toggleBtn.setAttribute('aria-label', 'تبديل القائمة الجانبية');
            toggleBtn.style.marginInlineEnd = '15px';
            toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
            
            // Wrap the title and button in a div to preserve flex space-between layout
            const titleElement = dashboardHeader.querySelector('h1, h2, h3');
            if (titleElement) {
                const wrapper = document.createElement('div');
                wrapper.style.display = 'flex';
                wrapper.style.alignItems = 'center';
                dashboardHeader.insertBefore(wrapper, titleElement);
                wrapper.appendChild(toggleBtn);
                wrapper.appendChild(titleElement);
                titleElement.style.margin = '0';
            } else {
                dashboardHeader.insertBefore(toggleBtn, dashboardHeader.firstChild);
            }
        }

        // Overlay
        let overlay = document.getElementById('adminSidebarOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'adminSidebarOverlay';
            overlay.className = 'admin-sidebar-overlay';
            document.body.appendChild(overlay);
        }

        const closeSidebar = () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            document.body.classList.remove('sidebar-open');
        };

        toggleBtn.addEventListener('click', () => {
            const isOpen = sidebar.classList.toggle('open');
            overlay.classList.toggle('active', isOpen);
            document.body.classList.toggle('sidebar-open', isOpen);
        });

        overlay.addEventListener('click', closeSidebar);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar.classList.contains('open')) {
                closeSidebar();
            }
        });
    },

    initLogoutHandler() {
        // Sidebar logout button
        const logoutBtn = document.getElementById('adminLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                AdminAuth.logout();
            });
        }
        
        // Header logout buttons
        const headerLogoutBtns = document.querySelectorAll('.admin-logout-btn');
        headerLogoutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                AdminAuth.logout();
            });
        });
    },

    showToast(message, type = 'info', duration = 3500) {
        let container = document.getElementById('adminToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'adminToastContainer';
            container.className = 'admin-toast-container';
            document.body.appendChild(container);
        }

        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `admin-toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${iconMap[type] || 'fa-info-circle'}"></i>
            <span>${AdminTable.escapeHtml(message)}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    confirm(message, title = 'تأكيد الإجراء') {
        return new Promise((resolve) => {
            let modal = document.getElementById('adminConfirmModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'adminConfirmModal';
                modal.className = 'admin-modal-backdrop';
                modal.innerHTML = `
                    <div class="admin-confirm-card">
                        <h3 id="adminConfirmTitle"></h3>
                        <p id="adminConfirmMessage"></p>
                        <div class="admin-confirm-actions">
                            <button id="adminConfirmCancel" class="btn-secondary">إلغاء</button>
                            <button id="adminConfirmOk" class="btn-primary">تأكيد</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }

            const titleEl = document.getElementById('adminConfirmTitle');
            const msgEl = document.getElementById('adminConfirmMessage');
            const okBtn = document.getElementById('adminConfirmOk');
            const cancelBtn = document.getElementById('adminConfirmCancel');

            titleEl.textContent = title;
            msgEl.textContent = message;
            modal.style.display = 'flex';

            const cleanup = (result) => {
                modal.style.display = 'none';
                okBtn.onclick = null;
                cancelBtn.onclick = null;
                resolve(result);
            };

            okBtn.onclick = () => cleanup(true);
            cancelBtn.onclick = () => cleanup(false);
        });
    },

    setButtonLoading(btn, isLoading, loadingText = 'جاري الحفظ...') {
        if (!btn) return;
        if (isLoading) {
            btn.dataset.originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
        } else {
            btn.disabled = false;
            if (btn.dataset.originalHtml) {
                btn.innerHTML = btn.dataset.originalHtml;
                delete btn.dataset.originalHtml;
            }
        }
    }
};

const AdminTable = {
    escapeHtml(str) {
        if (!str && str !== 0) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    debounce(fn, delay = 300) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    renderPagination({ containerId, current, total, onPageClickName }) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (total <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';
        for (let i = 1; i <= total; i++) {
            if (i === current) {
                html += `<button class="page-btn active" class="page-btn active">${i}</button>`;
            } else if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
                html += `<button class="page-btn" data-action="${onPageClickName}" data-args="${i}" class="page-btn">${i}</button>`;
            } else if (i === current - 2 || i === current + 2) {
                html += `<span class="page-dots">...</span>`;
            }
        }
        container.innerHTML = html;
    }
};

// Global Exposure
window.AdminAuth = AdminAuth;
window.AdminUI = AdminUI;
window.AdminTable = AdminTable;

// Initialize on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    AdminUI.init();
});

function handleAdminGenericAction(e, type) {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') {
        if (type === 'click') return;
    }
    
    const action = actionEl.dataset.action;
    if (typeof window[action] === 'function') {
        if (type === 'click' || type === 'submit') e.preventDefault();
        let args = [];
        if (actionEl.dataset.args) {
            try { 
                args = actionEl.dataset.args.split(',').map(s => {
                    s = s.trim();
                    if (s === 'this') return actionEl;
                    if (s === 'this.value') return actionEl.value;
                    if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
                    if (s.startsWith("&quot;") && s.endsWith("&quot;")) return s.slice(6, -6);
                    if (!isNaN(s) && s !== '') return Number(s);
                    return s;
                });
            } catch(e){}
        }
        if (type === 'submit') { window[action](e); } else { window[action](...args); }
    }
}
document.addEventListener('click', e => handleAdminGenericAction(e, 'click'));
document.addEventListener('change', e => handleAdminGenericAction(e, 'change'));
document.addEventListener('submit', e => handleAdminGenericAction(e, 'submit'));
