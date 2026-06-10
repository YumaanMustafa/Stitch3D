import db from "./db.js";
import bcrypt from "bcryptjs";

/**
 * @file initDb.js
 * @description Database Initialization Script.
 * - Creates necessary tables (users, customers, vendors, orders, etc.) if they don't exist.
 * - Seeds default admin and sample vendor accounts.
 * - Seeds sample product data for development.
 * 
 * Usage: Run directly via `node src/lib/initDb.js` or via `npm run db:init`.
 */

async function run() {
  try {
    console.log("🔧 Initializing database schema...");

    // users
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255),
        role ENUM('customer','supplier','vendor','admin') DEFAULT 'customer',
        status VARCHAR(50) DEFAULT 'pending',
        two_fa_code VARCHAR(20),
        two_fa_expires_at DATETIME,
        reset_code VARCHAR(20),
        reset_expires DATETIME,
        profile_picture VARCHAR(255),
        deletion_requested_at TIMESTAMP NULL DEFAULT NULL,
        deletion_reason VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // customers
    await db.query(`
      CREATE TABLE IF NOT EXISTS customers (
        customer_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        phone_number VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100),
        postal_code VARCHAR(50),
        payment_card_last4 VARCHAR(4),
        payment_card_expiry VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // suppliers
    await db.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        supplier_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        approved TINYINT(1) DEFAULT 0,
        business_registration_number VARCHAR(255),
        phone VARCHAR(100),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // vendors (note: code expects column named `password`)
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS vendors (
          vendor_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          name VARCHAR(255),
          email VARCHAR(255),
          password VARCHAR(255),
          company_name VARCHAR(255),
          phone_number VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
        ) ENGINE=InnoDB;
      `);
    } catch (e) {
      console.warn("⚠️ Unable to create 'vendors' with foreign key, creating without FK. Reason:", e.sqlMessage || e.message);
      await db.query(`
        CREATE TABLE IF NOT EXISTS vendors (
          vendor_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          name VARCHAR(255),
          email VARCHAR(255),
          password VARCHAR(255),
          company_name VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
      `);
    }

    // admins
    await db.query(`
      CREATE TABLE IF NOT EXISTS admins (
        admin_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // orders
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS orders (
          order_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          customer_id INT NOT NULL,
          vendor_id INT,
          subtotal DECIMAL(10,2) DEFAULT 0,
          shipping_fee DECIMAL(10,2) DEFAULT 0,
          tax DECIMAL(10,2) DEFAULT 0,
          total DECIMAL(10,2) DEFAULT 0,
          shipping_method VARCHAR(100),
          status VARCHAR(50) DEFAULT 'Processing',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
          FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL
        ) ENGINE=InnoDB;
      `);
    } catch (e) {
      console.warn("⚠️ Unable to create 'orders' with foreign key, creating without FK. Reason:", e.sqlMessage || e.message);
      await db.query(`
        CREATE TABLE IF NOT EXISTS orders (
          order_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          customer_id INT NOT NULL,
          vendor_id INT,
          subtotal DECIMAL(10,2) DEFAULT 0,
          shipping_fee DECIMAL(10,2) DEFAULT 0,
          tax DECIMAL(10,2) DEFAULT 0,
          total DECIMAL(10,2) DEFAULT 0,
          shipping_method VARCHAR(100),
          status VARCHAR(50) DEFAULT 'Processing',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
      `);
    }

    // order_items
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS order_items (
          item_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          vendor_id INT,
          design_id VARCHAR(50),
          title VARCHAR(255),
          color VARCHAR(50),
          material VARCHAR(100),
          price DECIMAL(10,2) DEFAULT 0,
          quantity INT DEFAULT 1,
          img_src LONGTEXT,
          size VARCHAR(50),
          FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
          FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL
        ) ENGINE=InnoDB;
      `);
    } catch (e) {
      console.warn("⚠️ Unable to create 'order_items' with foreign key. Reason:", e.sqlMessage || e.message);
      await db.query(`
        CREATE TABLE IF NOT EXISTS order_items (
          item_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          vendor_id INT,
          design_id VARCHAR(50),
          title VARCHAR(255),
          color VARCHAR(50),
          material VARCHAR(100),
          price DECIMAL(10,2) DEFAULT 0,
          quantity INT DEFAULT 1,
          img_src LONGTEXT,
          size VARCHAR(50)
        ) ENGINE=InnoDB;
      `);
    }

    // design_requests (used by vendor dashboard)
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS design_requests (
          design_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          vendor_id INT DEFAULT NULL,
          views LONGTEXT,
          snapshots LONGTEXT,
          preview LONGTEXT,
          title VARCHAR(255),
          description TEXT,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL
        ) ENGINE=InnoDB;
      `);
    } catch (e) {
      console.warn("⚠️ Unable to create 'design_requests' with foreign key, creating without FK. Reason:", e.sqlMessage || e.message);
      await db.query(`
        CREATE TABLE IF NOT EXISTS design_requests (
          design_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          vendor_id INT DEFAULT NULL,
          views LONGTEXT,
          snapshots LONGTEXT,
          preview LONGTEXT,
          title VARCHAR(255),
          description TEXT,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
      `);
    }

    // messages
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS messages (
          message_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          sender_id INT NOT NULL,
          receiver_id INT NOT NULL,
          content TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
          FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `);
    } catch (e) {
      console.warn("⚠️ Unable to create 'messages' with foreign key. Reason:", e.sqlMessage || e.message);
      await db.query(`
        CREATE TABLE IF NOT EXISTS messages (
          message_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          sender_id INT NOT NULL,
          receiver_id INT NOT NULL,
          content TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
      `);
    }

    // customized_designs (Replaces Prisma)
    await db.query(`
      CREATE TABLE IF NOT EXISTS customized_designs (
        id VARCHAR(50) NOT NULL PRIMARY KEY,
        user_id INT,
        vendor_id INT,
        name VARCHAR(255),
        color VARCHAR(50),
        material VARCHAR(100),
        size VARCHAR(50),
        views LONGTEXT,
        snapshots LONGTEXT,
        preview LONGTEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Self-healing patches for dev DB
    try { await db.query('ALTER TABLE customized_designs ADD COLUMN user_id INT;'); } catch (e) { }
    try { await db.query('ALTER TABLE customized_designs ADD COLUMN vendor_id INT;'); } catch (e) { }
    try { await db.query('ALTER TABLE customized_designs ADD COLUMN material VARCHAR(100);'); } catch (e) { }
    try { await db.query('ALTER TABLE customized_designs ADD COLUMN size VARCHAR(50);'); } catch (e) { }
    try { await db.query("ALTER TABLE customized_designs ADD COLUMN status VARCHAR(50) DEFAULT 'Pending';"); } catch (e) { }
    try { await db.query('ALTER TABLE customized_designs ADD COLUMN snapshots LONGTEXT;'); } catch (e) { }
    try { await db.query('ALTER TABLE customers ADD COLUMN payment_card_last4 VARCHAR(4);'); } catch (e) { }
    try { await db.query('ALTER TABLE customers ADD COLUMN payment_card_expiry VARCHAR(10);'); } catch (e) { }
    try { await db.query('ALTER TABLE users ADD COLUMN deletion_requested_at TIMESTAMP NULL DEFAULT NULL;'); } catch (e) { }
    try { await db.query('ALTER TABLE users ADD COLUMN deletion_reason VARCHAR(255) DEFAULT NULL;'); } catch (e) { }
    try { await db.query('ALTER TABLE vendor_products ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.00;'); } catch (e) { }
    try { await db.query('ALTER TABLE vendor_products ADD COLUMN total_reviews INT DEFAULT 0;'); } catch (e) { }

    // custom_uploads (For persistent user patches)
    await db.query(`
      CREATE TABLE IF NOT EXISTS custom_uploads (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        name VARCHAR(255),
        src LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Patch for existing custom_uploads table
    try { await db.query('ALTER TABLE custom_uploads ADD COLUMN user_id INT;'); } catch (e) { }

    // material_requests table
    await db.query(`
      CREATE TABLE IF NOT EXISTS material_requests (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT,
        supplier_id INT,
        material_name VARCHAR(255),
        type VARCHAR(255),
        quantity INT,
        size VARCHAR(255),
        urgency ENUM('low', 'medium', 'high', 'Low', 'Medium', 'High'),
        status ENUM('pending', 'quoted', 'renegotiating', 'accepted', 'rejected', 'completed') DEFAULT 'pending',
        renegotiated_price DECIMAL(10,2) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    // Self-healing patches for material_requests
    try { await db.query("ALTER TABLE material_requests MODIFY COLUMN status ENUM('pending', 'quoted', 'renegotiating', 'accepted', 'rejected', 'completed') DEFAULT 'pending';"); } catch (e) { }
    try { await db.query("ALTER TABLE material_requests ADD COLUMN renegotiated_price DECIMAL(10,2) DEFAULT NULL;"); } catch (e) { }

    // bills table
    await db.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        request_id INT,
        item_price DECIMAL(10,2) DEFAULT 0,
        tax DECIMAL(10,2) DEFAULT 0,
        shipping DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES material_requests(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // vendor_products table used by vendorProducts router
    await db.query(`
      CREATE TABLE IF NOT EXISTS vendor_products (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) DEFAULT 0,
        stock INT DEFAULT 0,
        category VARCHAR(255),
        image VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Active',
        average_rating DECIMAL(3,2) DEFAULT 0.00,
        total_reviews INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    // supplier_inventory table
    await db.query(`
      CREATE TABLE IF NOT EXISTS supplier_inventory (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        supplier_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100),
        size VARCHAR(255),
        price DECIMAL(10,2) DEFAULT 0,
        stock INT DEFAULT 0,
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        image LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // notifications table
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

    // product_reviews table
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS product_reviews (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          customer_id INT NOT NULL,
          rating INT NOT NULL,
          review_text TEXT,
          vendor_reply TEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES vendor_products(id) ON DELETE CASCADE,
          FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `);
      console.log("✅ product_reviews table ensured.");
    } catch (e) {
      console.warn("⚠️ Unable to create 'product_reviews' with foreign key, creating without FK. Reason:", e.message);
      await db.query(`
        CREATE TABLE IF NOT EXISTS product_reviews (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          customer_id INT NOT NULL,
          rating INT NOT NULL,
          review_text TEXT,
          vendor_reply TEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
      `);
    }

    // complaints table
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS complaints (
          complaint_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          type ENUM('order', 'vendor', 'technical', 'other') DEFAULT 'other',
          order_id VARCHAR(50),
          subject VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          status ENUM('pending', 'reviewed', 'resolved') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `);
      console.log("✅ complaints table ensured.");
    } catch (e) {
      console.warn("⚠️ Unable to create 'complaints' with foreign key, creating without FK. Reason:", e.message);
      await db.query(`
        CREATE TABLE IF NOT EXISTS complaints (
          complaint_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          type ENUM('order', 'vendor', 'technical', 'other') DEFAULT 'other',
          order_id VARCHAR(50),
          subject VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          status ENUM('pending', 'reviewed', 'resolved') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
      `);
    }

    // Patch for existing supplier_inventory table
    try { await db.query('ALTER TABLE supplier_inventory ADD COLUMN size VARCHAR(255) AFTER type;'); } catch (e) { }

    // --- Seed a default admin if none exists ---
    const defaultAdminEmail = process.env.ADMIN_EMAIL || "admin@stitch.local";
    const defaultAdminPass = process.env.ADMIN_PASS || "admin123";
    const [existingAdmin] = await db.query("SELECT admin_id FROM admins WHERE email = ?", [defaultAdminEmail]);
    if (!existingAdmin.length) {
      const hashed = await bcrypt.hash(defaultAdminPass, 10);
      await db.query("INSERT INTO admins (email, password, name, created_at) VALUES (?, ?, ?, NOW())", [defaultAdminEmail, hashed, "Local Admin"]);
      console.log(`✅ Seeded admin: ${defaultAdminEmail} (password from ADMIN_PASS or 'admin123')`);
    } else {
      console.log("ℹ️ Admin user already exists, skipping admin seed.");
    }

    // --- Seed a sample vendor if none exists ---
    const sampleVendorEmail = process.env.SAMPLE_VENDOR_EMAIL || "vendor@stitch.local";
    const sampleVendorPass = process.env.SAMPLE_VENDOR_PASS || "vendor123";
    const [existingVendor] = await db.query("SELECT vendor_id FROM vendors WHERE email = ?", [sampleVendorEmail]);
    if (!existingVendor.length) {
      const hashedVendor = await bcrypt.hash(sampleVendorPass, 10);
      const [vResult] = await db.query("INSERT INTO vendors (name, email, password, company_name, created_at) VALUES (?, ?, ?, ?, NOW())", [
        "Sample Vendor",
        sampleVendorEmail,
        hashedVendor,
        "Sample Co",
      ]);
      console.log(`✅ Seeded sample vendor: ${sampleVendorEmail} (password from SAMPLE_VENDOR_PASS or 'vendor123')`);

      // Create a corresponding `users` row for vendor login via /api/auth/login
      const [existingUser] = await db.query("SELECT user_id FROM users WHERE email = ?", [sampleVendorEmail]);
      if (!existingUser.length) {
        const [uResult] = await db.query(
          `INSERT INTO users (first_name, last_name, email, password_hash, role, status, created_at)
           VALUES (?, ?, ?, ?, 'vendor', 'active', NOW())`,
          ["Sample", "Vendor", sampleVendorEmail, hashedVendor]
        );
        const userId = uResult.insertId;
        await db.query("UPDATE vendors SET user_id = ? WHERE vendor_id = ?", [userId, vResult.insertId]);
        console.log(`✅ Created linked users.user_id=${userId} and updated vendors.user_id`);
      } else {
        // if a user exists, link it
        await db.query("UPDATE vendors SET user_id = ? WHERE vendor_id = ?", [existingUser[0].user_id, vResult.insertId]);
        console.log(`✅ Linked existing users.user_id=${existingUser[0].user_id} to vendor`);
      }
    } else {
      console.log("ℹ️ Sample vendor already exists, checking for user link...");
      // ensure vendors.user_id is linked to a users row
      const [[vendorRow]] = await db.query("SELECT vendor_id, user_id FROM vendors WHERE email = ?", [sampleVendorEmail]);
      if (vendorRow && !vendorRow.user_id) {
        const [existingUser] = await db.query("SELECT user_id FROM users WHERE email = ?", [sampleVendorEmail]);
        if (!existingUser.length) {
          const hashedVendor = await bcrypt.hash(sampleVendorPass, 10);
          const [uResult] = await db.query(
            `INSERT INTO users (first_name, last_name, email, password_hash, role, status, created_at)
             VALUES (?, ?, ?, ?, 'vendor', 'active', NOW())`,
            ["Sample", "Vendor", sampleVendorEmail, hashedVendor]
          );
          await db.query("UPDATE vendors SET user_id = ? WHERE vendor_id = ?", [uResult.insertId, vendorRow.vendor_id]);
          console.log(`✅ Created and linked users.user_id=${uResult.insertId} to existing vendor`);
        } else {
          await db.query("UPDATE vendors SET user_id = ? WHERE vendor_id = ?", [existingUser[0].user_id, vendorRow.vendor_id]);
          console.log(`✅ Linked existing users.user_id=${existingUser[0].user_id} to existing vendor`);
        }
      } else {
        console.log("ℹ️ Existing vendor already linked to a user.");
      }
    }

    // --- Seed Sample Products (Dynamic Gap Fill) ---
    const [existingProducts] = await db.query("SELECT COUNT(*) as count FROM vendor_products");
    if (existingProducts[0].count < 5) {
      console.log("ℹ️ Seeding initial products...");
      const sampleProducts = [
        { name: "Classic Biker Jacket", price: 22000.00, stock: 15, category: "Biker", image: "https://images.unsplash.com/photo-1551028919-383718eccf3f?auto=format&fit=crop&q=80&w=800" },
        { name: "Midnight Bomber", price: 18500.00, stock: 8, category: "Bomber", image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=800" },
        { name: "Vintage Racer", price: 26000.00, stock: 3, category: "Racer", image: "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&q=80&w=800" },
        { name: "Heritage Aviator", price: 32000.00, stock: 12, category: "Aviator", image: "https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&q=80&w=800" },
        { name: "Urban Stealth", price: 21000.00, stock: 20, category: "Motocross", image: "https://images.unsplash.com/photo-1559551409-dadc959f76b8?auto=format&fit=crop&q=80&w=800" },
        { name: "Crimson Rider", price: 24000.00, stock: 6, category: "Biker", image: "https://images.unsplash.com/photo-1515347619252-60a6bf4fffce?auto=format&fit=crop&q=80&w=800" },
        { name: "Distressed Field Jacket", price: 19500.00, stock: 10, category: "Field", image: "https://images.unsplash.com/photo-1504198458649-3128b932f49e?auto=format&fit=crop&q=80&w=800" },
        { name: "Suede Cafe Racer", price: 28000.00, stock: 4, category: "Racer", image: "https://images.unsplash.com/photo-1506152983158-b4a74a01c721?auto=format&fit=crop&q=80&w=800" }
      ];

      // Get sample vendor ID
      const [[sVendor]] = await db.query("SELECT vendor_id FROM vendors WHERE email = ?", [sampleVendorEmail]);
      const vId = sVendor ? sVendor.vendor_id : null;

      for (const p of sampleProducts) {
        await db.query(`
                INSERT INTO vendor_products (vendor_id, name, price, stock, category, image, status)
                VALUES (?, ?, ?, ?, ?, ?, 'Active')
             `, [vId, p.name, p.price, p.stock, p.category, p.image]);
      }
      console.log(`✅ Seeded ${sampleProducts.length} sample products.`);
    } else {
      console.log("ℹ️ Products already exist, skipping seed.");
    }

    // --- Seed Supplier Inventory for existing suppliers 1 & 2 ---
    const sampleInventoryItems = [
      { name: "Metal Buttons", type: "Accessories", size: "15mm", price: 5.00, stock: 2000, image: "https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&q=80&w=200" },
      { name: "Heavy Duty YKK Zipper", type: "Fasteners", size: "30cm", price: 45.00, stock: 500, image: "https://images.unsplash.com/photo-1594540911438-27517c24483a?auto=format&fit=crop&q=80&w=200" },
      { name: "Premium Calf Leather", type: "Fabric", size: "10 sq ft", price: 1500.00, stock: 100, image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=200" },
      { name: "Organic Indigo Denim Fabric", type: "Fabric", size: "50m roll", price: 8500.00, stock: 25, image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&q=80&w=200" },
      { name: "High Tenacity Thread", type: "Threads", size: "5000m spool", price: 250.00, stock: 150, image: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&q=80&w=200" }
    ];

    const [suppliersList] = await db.query("SELECT supplier_id FROM suppliers WHERE supplier_id IN (1, 2)");
    for (const s of suppliersList) {
      const [existingCount] = await db.query("SELECT COUNT(*) as count FROM supplier_inventory WHERE supplier_id = ?", [s.supplier_id]);
      if (existingCount[0].count === 0) {
        console.log(`ℹ️ Seeding inventory for supplier_id ${s.supplier_id}...`);
        for (const item of sampleInventoryItems) {
          await db.query(`
            INSERT INTO supplier_inventory (supplier_id, name, type, size, price, stock, status, image)
            VALUES (?, ?, ?, ?, ?, ?, 'Active', ?)
          `, [s.supplier_id, item.name, item.type, item.size, item.price, item.stock, item.image]);
        }
        console.log(`✅ Seeded 5 inventory items for supplier_id ${s.supplier_id}`);
      } else {
        console.log(`ℹ️ Inventory already exists for supplier_id ${s.supplier_id}, skipping seed.`);
      }
    }

    console.log("✅ Database schema initialization complete.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Database initialization failed:", err);
    process.exit(1);
  }
}

run();