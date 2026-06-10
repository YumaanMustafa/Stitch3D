
import db from "./src/lib/db.js";

async function runMigration() {
  try {
    console.log("🔧 Running multi-tenant isolation migration...");

    // 1. Add vendor_id to vendor_products
    try {
      await db.query("ALTER TABLE vendor_products ADD COLUMN vendor_id INT AFTER id;");
      await db.query("ALTER TABLE vendor_products ADD FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL;");
      console.log("✅ Added vendor_id to vendor_products");
    } catch (e) {
      console.log("ℹ️ vendor_id already exists in vendor_products or error:", e.message);
    }

    // 2. Add vendor_id to orders
    try {
      await db.query("ALTER TABLE orders ADD COLUMN vendor_id INT AFTER customer_id;");
      await db.query("ALTER TABLE orders ADD FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL;");
      console.log("✅ Added vendor_id to orders");
    } catch (e) {
      console.log("ℹ️ vendor_id already exists in orders or error:", e.message);
    }

    // 3. Add vendor_id and size to order_items
    try {
      await db.query("ALTER TABLE order_items ADD COLUMN vendor_id INT AFTER order_id;");
      await db.query("ALTER TABLE order_items ADD COLUMN size VARCHAR(50) AFTER img_src;");
      await db.query("ALTER TABLE order_items ADD FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL;");
      console.log("✅ Added vendor_id and size to order_items");
    } catch (e) {
      console.log("ℹ️ vendor_id/size already exists in order_items or error:", e.message);
    }

    // 4. Create notifications table
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        role VARCHAR(50),
        title VARCHAR(255),
        message TEXT,
        type VARCHAR(50),
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log("✅ Notifications table ensured");

    // 5. Backfill existing products to the first vendor if possible
    const [vendors] = await db.query("SELECT vendor_id FROM vendors LIMIT 1");
    if (vendors.length > 0) {
        const vId = vendors[0].vendor_id;
        await db.query("UPDATE vendor_products SET vendor_id = ? WHERE vendor_id IS NULL", [vId]);
        console.log(`✅ Backfilled existing products to vendor_id: ${vId}`);
    }

    console.log("🚀 Migration complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
