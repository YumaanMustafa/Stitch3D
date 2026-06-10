
require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

async function updateVendorStatus(vendorId, newStatus) {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || "localhost",
            user: process.env.DB_USER || "root",
            password: process.env.DB_PASS || "",
            database: process.env.DB_NAME || "stitch3d"
        });
        console.log(`Connected to DB. Attempting to update Vendor ${vendorId} status to '${newStatus}'`);

        // 1. Find User ID
        const [rows] = await connection.query("SELECT user_id FROM vendors WHERE vendor_id = ?", [vendorId]);
        console.log("Found vendor rows:", rows);

        if (rows.length > 0 && rows[0].user_id) {
            const userId = rows[0].user_id;
            console.log(`Updating user ${userId} status to '${newStatus}'`);

            // 2. Execute Update
            const [updateResult] = await connection.execute("UPDATE users SET status = ? WHERE user_id = ?", [newStatus, userId]);
            console.log("Update result:", updateResult);

            // 3. Verify
            const [userRows] = await connection.query("SELECT status FROM users WHERE user_id = ?", [userId]);
            console.log("User status in DB after update:", userRows[0]);
        } else {
            console.warn(`Vendor ${vendorId} has no linked user_id.`);
        }

        await connection.end();
    } catch (e) {
        console.error(e);
    }
}

// Try to update Vendor 19 to 'rejected'
updateVendorStatus(19, 'rejected');
