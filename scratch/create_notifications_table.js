
import db from '../src/lib/db.js';

async function createTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                role ENUM('customer', 'vendor', 'supplier', 'admin') NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'info',
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Notifications table created successfully.");
    } catch (err) {
        console.error("Error creating notifications table:", err);
    } finally {
        process.exit();
    }
}

createTable();
