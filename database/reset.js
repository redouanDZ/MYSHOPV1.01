require('dotenv').config();
const mysql = require('mysql2/promise');

async function resetDatabase() {
    const dbConfig = require('../src/config/database.js').getConfig();
    
    // Connect without database selected to drop and recreate it
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        port: dbConfig.port
    });

    console.log('🖐️ Dropping database ' + dbConfig.database + '...');
    await connection.query('DROP DATABASE IF EXISTS `' + dbConfig.database + '`');
    
    console.log('✄ Creating database ' + dbConfig.database + '...');
    await connection.query('CREATE DATABASE `' + dbConfig.database + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    
    await connection.end();
    
    console.log('✅ Database reset complete. Running migrations...');
    require('./migrate.js');
}

resetDatabase().catch(err => {
    console.error(err);
    process.exit(1);
});