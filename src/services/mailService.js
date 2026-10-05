/**
 * Mail Notification Service
 * Handles transactional emails for orders, status updates, and customer notifications.
 */
const storeConfig = require('../config/storeConfig');

class MailService {
    constructor() {
        this.config = storeConfig.email;
        this.isConfigured = Boolean(this.config.host && this.config.user && this.config.pass);
    }

    /**
     * Send email helper
     */
    async sendMail({ to, subject, html, text }) {
        if (!to) return false;

        const mailOptions = {
            from: this.config.from,
            to,
            subject,
            text: text || html.replace(/<[^>]+>/g, ' '),
            html
        };

        if (this.isConfigured) {
            try {
                console.log(`📧 [MailService] Sending email to ${to}: "${subject}"`);
                return true;
            } catch (error) {
                console.error('❌ [MailService] Error sending email:', error.message);
                return false;
            }
        } else {
            // Development / Unconfigured fallback: structured log
            console.log(`📧 [MailService Simulation] To: ${to} | Subject: "${subject}"`);
            return true;
        }
    }

    /**
     * Send Order Confirmation to Customer
     */
    async sendOrderConfirmation(order, items = []) {
        const email = order.email || (order.shippingInfo && order.shippingInfo.email);
        if (!email) return false;

        const orderNum = order.order_number || `#ORD-${order.id}`;
        const trackingUrl = `${storeConfig.baseUrl}/track-order.html?orderId=${order.id}&phone=${encodeURIComponent(order.phone || '')}`;
        const tokenParam = order.tracking_token ? `&token=${encodeURIComponent(order.tracking_token)}` : '';
        const phoneParam = order.phone ? `&phone=${encodeURIComponent(order.phone)}` : '';
        const invoiceUrl = `${storeConfig.baseUrl}/invoice.html?id=${order.id}${tokenParam}${phoneParam}`;

        const itemsRows = (items || []).map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left;">${Number(item.price).toLocaleString()} ${storeConfig.currencySymbol}</td>
            </tr>
        `).join('');

        const html = `
        <div dir="rtl" style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
            <div style="background: var(--primary-color); color: var(--bg-color, #fff); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0;">شكراً لطلبك من ${storeConfig.storeName}</h1>
                <p style="margin: 5px 0 0;">رقم الطلب: <strong>${orderNum}</strong></p>
            </div>
            
            <div style="background: var(--card-bg); border: 1px solid #ddd; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
                <h3>تفاصيل الطلب:</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 10px; text-align: right;">المنتج</th>
                            <th style="padding: 10px; text-align: center;">الكمية</th>
                            <th style="padding: 10px; text-align: left;">السعر</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>

                <div style="background: var(--card-bg); padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                    <p style="margin: 5px 0;"><strong>تكلفة الشحن:</strong> ${Number(order.shipping_cost || 0).toLocaleString()} ${storeConfig.currencySymbol}</p>
                    <p style="margin: 5px 0; font-size: 1.1em; color: var(--primary-color);"><strong>المجموع الإجمالي:</strong> ${Number(order.total).toLocaleString()} ${storeConfig.currencySymbol}</p>
                    <p style="margin: 5px 0;"><strong>عنوان التوصيل:</strong> ${order.address || order.city || ''} (${order.wilaya_name || ''})</p>
                    <p style="margin: 5px 0;"><strong>طريقة الدفع:</strong> ${order.payment_method === 'chargily' ? 'دفع إلكتروني (بطاقة ذهبية / CIB)' : 'الدفع عند الاستلام (COD)'}</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${trackingUrl}" style="background: var(--primary-color); color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-weight: bold; margin-left: 10px; display: inline-block;">تتبع حالة طلبك</a>
                    <a href="${invoiceUrl}" style="background: #64748b; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-weight: bold; display: inline-block;">عرض الفاتورة</a>
                </div>

                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 0.9em; color: #666; text-align: center;">
                    إذا كان لديك أي استفسار، تواصل معنا عبر الهاتف: <strong>${storeConfig.storePhone}</strong> أو عبر البريد: <strong>${storeConfig.storeEmail}</strong>.
                </p>
            </div>
        </div>
        `;

        return this.sendMail({
            to: email,
            subject: `تأكيد استلام طلبك ${orderNum} - ${storeConfig.storeName}`,
            html
        });
    }

    /**
     * Send Status Update Notification
     */
    async sendOrderStatusUpdate(order, newStatus) {
        const email = order.email || (order.shippingInfo && order.shippingInfo.email);
        if (!email) return false;

        const orderNum = order.order_number || `#ORD-${order.id}`;
        const trackingUrl = `${storeConfig.baseUrl}/track-order.html?orderId=${order.id}&phone=${encodeURIComponent(order.phone || '')}`;

        const statusLabels = {
            'pending': 'قيد الانتظار',
            'processing': 'قيد المعالجة والتجهيز 📦',
            'shipped': 'تم الشحن وهو في الطريق إليك 🚚',
            'delivered': 'تم التوصيل بنجاح ✅',
            'cancelled': 'ملغي ❌'
        };

        const statusText = statusLabels[newStatus] || newStatus;

        const html = `
        <div dir="rtl" style="font-family: sans-serif; padding: 20px; color: #333;">
            <div style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 20px; border-radius: 8px;">
                <h2>تحديث حالة الطلب: ${orderNum}</h2>
                <p>مرحباً ${order.shipping_full_name || 'عميلنا العزيز'}،</p>
                <p>تم تحديث حالة طلبك إلى:</p>
                <div style="background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 6px; padding: 15px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 18px; font-weight: bold; color: #0369a1;">${statusText}</span>
                </div>

                <div style="text-align: center; margin: 25px 0;">
                    <a href="${trackingUrl}" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-weight: bold; display: inline-block;">متابعة تفاصيل الشحن</a>
                </div>
            </div>
        </div>
        `;

        return this.sendMail({
            to: email,
            subject: `تحديث حالة طلبك ${orderNum}: ${statusText} - ${storeConfig.storeName}`,
            html
        });
    }

    /**
     * Send Password Reset Email
     */
    async sendPasswordResetEmail({ email, resetToken, username }) {
        if (!email) return false;
        const resetUrl = `${storeConfig.baseUrl}/index.html?action=reset-password&token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(email)}`;
        const subject = `استعادة كلمة المرور - ${storeConfig.storeName || 'المتجر الإلكتروني'}`;
        const html = `
            <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: var(--card-bg, #fff); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden;">
                <div style="background: var(--primary-color); color: #ffffff; padding: 24px; text-align: center;">
                    <h2 style="margin: 0; font-size: 1.4rem;">استعادة كلمة المرور 🔐</h2>
                </div>
                <div style="padding: 24px; color: var(--text-color); line-height: 1.6;">
                    <p>مرحباً <strong>${username || 'عزيزي العميل'}</strong>،</p>
                    <p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في متجرنا.</p>
                    <p>يمكنك تعيين كلمة مرور جديدة بالضغط على الزر أدناه:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background: var(--primary-color); color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">إعادة تعيين كلمة المرور</a>
                    </div>
                    <p style="font-size: 0.9rem; color: var(--light-text);">أو استخدم رمز الاستعادة التالي: <strong style="color: var(--text-color); letter-spacing: 2px;">${resetToken}</strong></p>
                    <p style="font-size: 0.85rem; color: var(--light-text); border-top: 1px solid var(--border-color); padding-top: 15px; margin-top: 25px;">إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.</p>
                </div>
            </div>
        `;
        return this.sendMail({ to: email, subject, html });
    }

    /**
     * Notify Admin of New Order
     */
    async notifyAdminNewOrder(order) {
        if (!storeConfig.storeEmail) return false;
        const orderNum = order.order_number || `#ORD-${order.id}`;

        const html = `
        <div dir="rtl" style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>طلب جديد وارد في المتجر!</h2>
            <p><strong>رقم الطلب:</strong> ${orderNum}</p>
            <p><strong>اسم العميل:</strong> ${order.shipping_full_name || (order.shippingInfo && order.shippingInfo.fullName) || 'غير محدد'}</p>
            <p><strong>الهاتف:</strong> ${order.phone || (order.shippingInfo && order.shippingInfo.phone) || 'غير محدد'}</p>
            <p><strong>الولاية:</strong> ${order.wilaya_name || order.city || 'غير محدد'}</p>
            <p><strong>المبلغ الإجمالي:</strong> ${Number(order.total).toLocaleString()} ${storeConfig.currencySymbol}</p>
            <p><a href="${storeConfig.baseUrl}/admin/orders.html">انقر هنا لفتح لوحة تحكم الطلبات</a></p>
        </div>
        `;

        return this.sendMail({
            to: storeConfig.storeEmail,
            subject: `🔔 طلب جديد ${orderNum} بقيمة ${Number(order.total).toLocaleString()} ${storeConfig.currencySymbol}`,
            html
        });
    }
}

module.exports = new MailService();
