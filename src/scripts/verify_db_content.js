
import db from "../lib/db.js";

async function checkDb() {
    try {
        console.log("Checking DB content...");

        // Check role distribution
        const [roles] = await db.query("SELECT role, COUNT(*) as count FROM users GROUP BY role");
        console.log("Roles distribution:");
        console.table(roles);

        process.exit(0);
    } catch (err) {
        console.error("DB Check failed:", err);
        process.exit(1);
    }
}

checkDb();
