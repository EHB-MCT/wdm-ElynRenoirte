const { initDB } = require('./database');

async function migrate() {
    try {
        await initDB();
        console.log('Database migration completed');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();