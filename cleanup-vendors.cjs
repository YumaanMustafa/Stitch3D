
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function cleanup() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || "localhost",
            user: process.env.DB_USER || "root",
            password: process.env.DB_PASS || "",
            database: process.env.DB_NAME || "stitch3d"
        });

        console.log("Deleting vendors with NULL user_id...");
        const [result] = await connection.execute("DELETE FROM vendors WHERE user_id IS NULL");
        console.log(`Deleted ${result.affectedRows} vendors.`);

        await connection.end();
    } catch (e) {
        console.error(e);
    }
}

cleanup();
