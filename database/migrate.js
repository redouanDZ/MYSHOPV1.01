/**
 * مشغّل الترحيلات التلقائي لـ MySQL (Automated Database Migration Runner)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const prevChar = i > 0 ? sql[i - 1] : '';
    const nextChar = i < sql.length - 1 ? sql[i + 1] : '';

    // Handle line comments: -- ... \n
    if (inLineComment) {
      if (char === '\n') inLineComment = false;
      current += char;
      continue;
    }

    // Handle block comments: /* ... */
    if (inBlockComment) {
      if (prevChar === '*' && char === '/') inBlockComment = false;
      current += char;
      continue;
    }

    // Check for comment starts when not in string
    if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (char === '-' && nextChar === '-') {
        inLineComment = true;
        current += char;
        continue;
      }
      if (char === '/' && nextChar === '*') {
        inBlockComment = true;
        current += char;
        continue;
      }
    }

    // Handle quotes (respecting escape backslash)
    if (char === "'" && !inDoubleQuote && !inBacktick && prevChar !== '\\') {
      inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }
    if (char === '"' && !inSingleQuote && !inBacktick && prevChar !== '\\') {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }
    if (char === '`' && !inSingleQuote && !inDoubleQuote && prevChar !== '\\') {
      inBacktick = !inBacktick;
      current += char;
      continue;
    }

    // Statement terminator outside quotes and comments
    if (char === ';' && !inSingleQuote && !inDoubleQuote && !inBacktick) {
      const trimmed = current.trim();
      if (trimmed) {
        statements.push(trimmed);
      }
      current = '';
    } else {
      current += char;
    }
  }

  const remainder = current.trim();
  if (remainder) {
    statements.push(remainder);
  }

  return statements;
}

async function runMigrations() {
  const env = process.env.NODE_ENV || 'development';
  const dbConfig = require('../src/config/database.js').getConfig();

  console.log(`🚀 بدء الترحيلات لقاعدة البيانات: ${dbConfig.database} على البيئة: [${env}]...`);

  let pool;
  try {
    pool = mysql.createPool({
      ...dbConfig,
      multipleStatements: true,
      waitForConnections: true,
      connectionLimit: 1
    });

    // 1. إنشاء جدول سجل الترحيلات إذا لم يكن موجوداً
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. جلب قائمة الترحيلات المنفذة سابقاً
    const [rows] = await pool.query('SELECT version FROM schema_migrations');
    const executedVersions = new Set(rows.map(r => r.version));

    // 3. قراءة ملفات الترحيل في مجلد migrations
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (!executedVersions.has(file)) {
        console.log(`⏳ جاري تنفيذ الترحيل: ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        if (sql.trim()) {
          const connection = await pool.getConnection();
          const createdTablesInFile = [];
          try {
            await connection.beginTransaction();

            const statements = splitSqlStatements(sql);
            for (const statement of statements) {
              try {
                // Track table creation for clean rollback on subsequent error
                const createMatch = statement.match(/^\s*CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`'"]?([a-zA-Z0-9_]+)/i);
                await connection.query(statement);
                if (createMatch && createMatch[1]) {
                  createdTablesInFile.push(createMatch[1]);
                }
              } catch (stmtErr) {
                const ignorableCodes = [
                  'ER_DUP_FIELDNAME',
                  'ER_DUP_KEYNAME',
                  'ER_TABLE_EXISTS_ERROR',
                  'ER_CANT_DROP_FIELD_OR_KEY'
                ];
                const ignorableErrnos = [1060, 1061, 1050, 1091];

                if (ignorableCodes.includes(stmtErr.code) || ignorableErrnos.includes(stmtErr.errno)) {
                  // Idempotent schema condition (e.g., column/index/table already exists during upgrade or fresh run)
                  console.log(`   ℹ️ [تجاوز آمن]: ${stmtErr.message}`);
                } else {
                  console.error(`❌ خطأ في تنفيذ عبارة SQL [${statement.slice(0, 100)}...]:`, stmtErr.message);
                  throw stmtErr;
                }
              }
            }

            await connection.query('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
            await connection.commit();
            console.log(`✅ تم تنفيذ الترحيل بنجاح: ${file}`);
            count++;
          } catch (err) {
            await connection.rollback();
            // Roll back any tables created in this failed migration batch
            for (const tbl of createdTablesInFile) {
              try {
                await connection.query(`DROP TABLE IF EXISTS \`${tbl}\``);
                console.log(`   🧹 [تراجع تلقائي]: تم حذف الجدول المنشأ جزئياً: ${tbl}`);
              } catch (cleanErr) {}
            }
            console.error(`❌ فشل الترحيل في الملف [${file}]:`, err.message);
            throw err;
          } finally {
            connection.release();
          }
        }
      }
    }

    if (count === 0) {
      console.log('✨ قاعدة البيانات محدثة بالكامل، لا توجد ترحيلات جديدة لتنفيذها.');
    } else {
      console.log(`🎉 اكتمل تنفيذ ${count} ترحيل(ات) بنجاح!`);
    }
  } catch (error) {
    console.error('❌ خطأ غير متوقع أثناء عملية الترحيل:', error.message);
    if (require.main === module) {
      process.exit(1);
    }
    throw error;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;
