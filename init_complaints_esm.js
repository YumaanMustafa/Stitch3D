import db from './src/lib/db.js';

async function init() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS complaints (
                complaint_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                type ENUM('order', 'vendor', 'technical', 'other') DEFAULT 'other',
                order_id VARCHAR(50),
                subject VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                status ENUM('pending', 'reviewed', 'resolved') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Complaints table created/verified.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error creating complaints table:", err);
        process.exit(1);
    }
}

init();
