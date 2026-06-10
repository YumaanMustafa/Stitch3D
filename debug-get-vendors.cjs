
require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

async function getVendors() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || "localhost",
            user: process.env.DB_USER || "root",
            password: process.env.DB_PASS || "",
            database: process.env.DB_NAME || "stitch3d"
        });
        console.log("Connected to DB.");

        const [vendors] = await connection.query(`
            SELECT v.*, u.status as user_status 
            FROM vendors v 
            LEFT JOIN users u ON v.user_id = u.user_id
            ORDER BY v.created_at DESC
        `);

        console.log("Vendors from GET query:");
        console.table(vendors.map(v => ({ id: v.vendor_id, uid: v.user_id, status: v.user_status })));

        await connection.end();
    } catch (e) {
        console.error(e);
    }
}

getVendors();
