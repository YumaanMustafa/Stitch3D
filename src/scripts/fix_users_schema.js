
import db from "../lib/db.js";

async function fixSchema() {
    try {
        console.log("🔧 Fixing users table schema...");

        // Check if columns exist to avoid duplicate column error if run multiple times
        const [cols] = await db.query("DESCRIBE users");
        const colNames = cols.map(c => c.Field);

        // 1. Add first_name if missing
        if (!colNames.includes("first_name")) {
            console.log("Adding first_name...");
            await db.query("ALTER TABLE users ADD COLUMN first_name VARCHAR(100) AFTER user_id");
            // Migrate name -> first_name
            if (colNames.includes("name")) {
                console.log("Migrating name -> first_name...");
                await db.query("UPDATE users SET first_name = name");
            }
        }

        // 2. Add last_name if missing
        if (!colNames.includes("last_name")) {
            console.log("Adding last_name...");
            await db.query("ALTER TABLE users ADD COLUMN last_name VARCHAR(100) AFTER first_name");
        }

        // 3. Add password_hash if missing
        if (!colNames.includes("password_hash")) {
            console.log("Adding password_hash...");
            await db.query("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) AFTER email");
            // Migrate password -> password_hash
            if (colNames.includes("password")) {
                console.log("Migrating password -> password_hash...");
                await db.query("UPDATE users SET password_hash = password");
            }
        }

        // 4. Add role if missing
        if (!colNames.includes("role")) {
            console.log("Adding role...");
            await db.query("ALTER TABLE users ADD COLUMN role ENUM('customer','supplier','vendor','admin') DEFAULT 'customer'");
        }

        // 5. Add status if missing
        if (!colNames.includes("status")) {
            console.log("Adding status...");
            await db.query("ALTER TABLE users ADD COLUMN status ENUM('pending','active','banned') DEFAULT 'pending'");
        }

        // 6. Add other missing columns
        if (!colNames.includes("two_fa_code")) {
            await db.query("ALTER TABLE users ADD COLUMN two_fa_code VARCHAR(20)");
        }
        if (!colNames.includes("two_fa_expires_at")) {
            await db.query("ALTER TABLE users ADD COLUMN two_fa_expires_at DATETIME");
        }
        if (!colNames.includes("reset_code")) {
            await db.query("ALTER TABLE users ADD COLUMN reset_code VARCHAR(20)");
        }
        if (!colNames.includes("reset_expires")) {
            await db.query("ALTER TABLE users ADD COLUMN reset_expires DATETIME");
        }
        if (!colNames.includes("profile_picture")) {
            await db.query("ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255)");
        }

        // 7. Cleanup old columns if they exist (optional, but good for cleanup)
        // Maybe keep them for safety? The app doesn't use 'name' or 'password'.
        // Let's drop 'name' and 'password' to avoid confusion if migration was successful.
        /*
        if (colNames.includes("name")) await db.query("ALTER TABLE users DROP COLUMN name");
        if (colNames.includes("password")) await db.query("ALTER TABLE users DROP COLUMN password");
        */

        console.log("✅ Users table schema fixed.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Schema fix failed:", err);
        process.exit(1);
    }
}

fixSchema();
