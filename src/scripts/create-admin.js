/**
 * Admin Creation CLI Script
 * Usage:
 *   node src/scripts/create-admin.js <email> <password> [username] [phone]
 * Or interactive prompt if arguments not provided.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const readline = require('readline');
const db = require('../data/db-connection');

function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function createAdmin() {
    console.log('--- 🛡️ إنشاء حساب مسؤول جديد (Admin Account Creation) ---');

    let email = process.argv[2] || process.env.ADMIN_EMAIL;
    let password = process.argv[3] || process.env.ADMIN_PASSWORD;
    let username = process.argv[4] || 'مدير النظام';
    let phone = process.argv[5] || '0550000000';

    if (!email) {
        email = await prompt('أدخل البريد الإلكتروني للمسؤول: ');
    }
    if (!password) {
        password = await prompt('أدخل كلمة المرور (8 أحرف على الأقل): ');
    }

    if (!email || !email.includes('@')) {
        console.error('❌ البريد الإلكتروني غير صالح.');
        process.exit(1);
    }
    if (!password || password.length < 8) {
        console.error('❌ كلمة المرور يجب أن تتكون من 8 أحرف على الأقل.');
        process.exit(1);
    }

    try {
        const existing = await db.findUserByEmail(email);
        if (existing) {
            console.error(`❌ المستخدم بالبريد [${email}] مسجل مسبقاً.`);
            process.exit(1);
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const [result] = await db.pool.query(
            'INSERT INTO users (username, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
            [username, email.toLowerCase().trim(), phone, passwordHash, 'admin']
        );

        console.log(`✅ تم إنشاء حساب المسؤول بنجاح! [ID: ${result.insertId}, Email: ${email}]`);
        process.exit(0);
    } catch (err) {
        console.error('❌ خطأ أثناء إنشاء حساب المسؤول:', err.message);
        process.exit(1);
    }
}

createAdmin();
