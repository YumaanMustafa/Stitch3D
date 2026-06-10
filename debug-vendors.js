
require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

async function checkVendors() {
    try {
        const connection = await mysql.createConnection(process.env.DATABASE_URL);
        console.log("Connected to DB");

        const [vendors] = await connection.query(`
            SELECT v.vendor_id, v.company_name, v.user_id, u.user_id as u_uid, u.email, u.status as u_status
            FROM vendors v
            LEFT JOIN users u ON v.user_id = u.user_id
        `);

        console.log("Vendors with User Status:");
        console.table(vendors);

        await connection.end();
    } catch (e) {
        console.error(e);
    }
}

checkVendors();
