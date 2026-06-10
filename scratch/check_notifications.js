
import db from '../src/lib/db.js';

async function checkTables() {
    try {
        const [rows] = await db.query("SHOW TABLES LIKE 'notifications'");
        console.log("Notifications table exists:", rows.length > 0);
        if (rows.length > 0) {
            const [desc] = await db.query("DESCRIBE notifications");
            console.log("Columns:", JSON.stringify(desc, null, 2));
        }
    } catch (err) {
        console.error("Error checking tables:", err);
    } finally {
        process.exit();
    }
}

checkTables();
