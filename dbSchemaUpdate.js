import db from "./src/lib/db.js";

async function updateSchema() {
  try {
    // 1. Alter order_items to add vendor_id
    try {
      await db.query("ALTER TABLE order_items ADD COLUMN vendor_id INT DEFAULT NULL");
      console.log("Added vendor_id to order_items.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log("vendor_id already exists on order_items.");
      else throw e;
    }

    // 2. Alter vendor_products to add vendor_id
    try {
      await db.query("ALTER TABLE vendor_products ADD COLUMN vendor_id INT DEFAULT NULL");
      console.log("Added vendor_id to vendor_products.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log("vendor_id already exists on vendor_products.");
      else throw e;
    }

    // 3. Get Vendor IDs
    const [vendors] = await db.query("SELECT vendor_id, email FROM vendors WHERE email IN ('charlie.vend@test.com', 'dave.vend@test.com')");
    
    if (vendors.length === 0) {
        console.log("Test vendors not found!");
        process.exit(1);
    }

    let charlieId = vendors.find(v => v.email === 'charlie.vend@test.com')?.vendor_id;
    let daveId = vendors.find(v => v.email === 'dave.vend@test.com')?.vendor_id;

    // 4. Insert mock products
    if (charlieId) {
        await db.query(`
            INSERT INTO vendor_products (vendor_id, name, price, stock, category, image, status)
            VALUES 
            (?, 'Charlie Custom Bomber Jacket', 120.00, 50, 'Bomber', 'https://images.unsplash.com/photo-1591561954557-26941169b49e', 'Active'),
            (?, 'Charlie Denim Streetwear', 150.00, 30, 'Denim', 'https://images.unsplash.com/photo-1591561954557-26941169b49e', 'Active')
        `, [charlieId, charlieId]);
    }

    if (daveId) {
        await db.query(`
            INSERT INTO vendor_products (vendor_id, name, price, stock, category, image, status)
            VALUES 
            (?, 'Dave Classic Leather Jacket', 200.00, 20, 'Leather', 'https://images.unsplash.com/photo-1551028719-00167b16eac5', 'Active'),
            (?, 'Dave Varsity Style Jacket', 180.00, 40, 'Varsity', 'https://images.unsplash.com/photo-1551028719-00167b16eac5', 'Active')
        `, [daveId, daveId]);
    }

    console.log("Schema updated and mock products inserted successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Error updating schema:", err);
    process.exit(1);
  }
}

updateSchema();
