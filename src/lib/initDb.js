// Import the database connection pool
import db from "./db.js";
// Import bcryptjs for securely hashing passwords before storing them in the database
import bcrypt from "bcryptjs";

/**
 * File: initDb.js
 * Description: A one-time setup script that builds the entire database structure.
 * - Creates all the tables (users, vendors, orders, etc.) if they don't already exist.
 * - Adds fake test users (like Alice, Bob, Charlie) so developers have accounts to log in with.
 * - Adds fake sample products so the shop isn't empty when testing.
 * 
 * To run this script manually, use: npm run db:init
 */

async function run() {
  try {
    console.log("🔧 Initializing database schema...");

    // ==========================================
    // 1. CREATE CORE TABLES
    // ==========================================

    // The 'users' table is the central hub. Everyone (customers, vendors, admins) has an entry here.
    // It stores login info like email, password, and what 'role' they have.
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

    // The 'customers' table stores extra details specifically for customers (like shipping addresses).
    // It is linked to the users table via user_id. If the user is deleted, the customer record is deleted (CASCADE).
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

    // The 'suppliers' table stores extra details for suppliers (like business registration numbers).
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

    // The 'vendors' table stores extra details for vendors (like shop name and address).
    // We wrap this in a try-catch block. Sometimes creating foreign keys fails on older MySQL setups, 
    // so we attempt it with the link, and if it fails, we fall back to creating it without the link.
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS vendors (
          vendor_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          name VARCHAR(255),
          company_name VARCHAR(255),
          phone_number VARCHAR(50),
          shop_address TEXT,
          specialization VARCHAR(100),
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
          company_name VARCHAR(255),
          phone_number VARCHAR(50),
          shop_address TEXT,
          specialization VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
      `);
    }

    // The 'admins' table stores super-user login info.
    // (Note: Currently admins have their own table instead of using the users table, which is a bit of technical debt).
    await db.query(`
      CREATE TABLE IF NOT EXISTS admins (
        admin_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // The 'orders' table tracks purchases made by customers from vendors.
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

    // The 'order_items' table tracks the specific jackets inside an order (since an order can have multiple jackets).
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

    // The 'design_requests' table holds designs sent by customers asking a vendor if they can build it.
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

    // The 'messages' table holds chat messages between users.
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

    // The 'customized_designs' table stores the 3D jacket data generated by the Canvas Customizer.
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

    // ==========================================
    // SELF HEALING DATABASE PATCHES
    // ==========================================
    // If the database already existed but was missing newer columns, we try to ADD them.
    // If they already exist, it will throw an error, which we safely catch and ignore.
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
    try { await db.query('ALTER TABLE vendors ADD COLUMN shop_address TEXT;'); } catch (e) { }
    try { await db.query('ALTER TABLE vendors ADD COLUMN specialization VARCHAR(100);'); } catch (e) { }
    // These drop older columns that were moved to the users table
    try { await db.query('ALTER TABLE vendors DROP COLUMN email;'); } catch (e) { }
    try { await db.query('ALTER TABLE vendors DROP COLUMN password;'); } catch (e) { }

    // 'custom_uploads' stores images users upload (like custom logos) to put on jackets
    await db.query(`
      CREATE TABLE IF NOT EXISTS custom_uploads (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        name VARCHAR(255),
        src LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    try { await db.query('ALTER TABLE custom_uploads ADD COLUMN user_id INT;'); } catch (e) { }

    // 'material_requests' tracks when a Vendor requests raw fabric/leather from a Supplier
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

    try { await db.query("ALTER TABLE material_requests MODIFY COLUMN status ENUM('pending', 'quoted', 'renegotiating', 'accepted', 'rejected', 'completed') DEFAULT 'pending';"); } catch (e) { }
    try { await db.query("ALTER TABLE material_requests ADD COLUMN renegotiated_price DECIMAL(10,2) DEFAULT NULL;"); } catch (e) { }

    // 'bills' stores invoices for material requests
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

    // 'vendor_products' stores the pre-made jackets that vendors list in their public shop
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

    // 'supplier_inventory' stores raw materials that suppliers offer to vendors
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

    // 'notifications' stores system alerts shown in the notification bell
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

    // 'product_reviews' allows customers to leave ratings on vendor products
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

    // 'complaints' allows users to report issues to the Admin
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

    try { await db.query('ALTER TABLE supplier_inventory ADD COLUMN size VARCHAR(255) AFTER type;'); } catch (e) { }

    // ==========================================
    // 2. SEED FAKE DATA FOR DEVELOPMENT
    // ==========================================
    
    // Hash a generic password "password123" so all test accounts use the same password
    const defaultPassword = "password123";
    const password_hash = await bcrypt.hash(defaultPassword, 10);

    // List of fake users to insert
    const testUsers = [
      { role: "customer", first: "Alice", last: "Customer", email: "alice.cust@test.com" },
      { role: "customer", first: "Bob", last: "Customer", email: "bob.cust@test.com" },
      { role: "vendor", first: "Charlie", last: "Vendor", email: "charlie.vend@test.com" },
      { role: "vendor", first: "Dave", last: "Vendor", email: "dave.vend@test.com" },
      { role: "supplier", first: "Eve", last: "Supplier", email: "eve.supp@test.com" },
      { role: "supplier", first: "Frank", last: "Supplier", email: "frank.supp@test.com" },
    ];

    // --- Seed Admin Account ---
    const defaultAdminEmail = process.env.ADMIN_EMAIL || "admin@stitch.local";
    const defaultAdminPass = process.env.ADMIN_PASS || "admin123";
    
    // Check if the admin already exists
    const [existingAdmin] = await db.query("SELECT admin_id FROM admins WHERE email = ?", [defaultAdminEmail]);
    if (!existingAdmin.length) {
      // Create admin if not found
      const adminHashed = await bcrypt.hash(defaultAdminPass, 10);
      await db.query("INSERT INTO admins (email, password, name, created_at) VALUES (?, ?, ?, NOW())", [defaultAdminEmail, adminHashed, "Local Admin"]);
      console.log(`✅ Seeded admin: ${defaultAdminEmail}`);
    } else {
      console.log("ℹ️ Admin user already exists, skipping admin seed.");
    }

    // --- Seed Demo Vendor Account ---
    const sampleVendorEmail = process.env.SAMPLE_VENDOR_EMAIL || "vendor@stitch.local";
    const sampleVendorPass = process.env.SAMPLE_VENDOR_PASS || "vendor123";
    const [existingVendor] = await db.query(
      "SELECT v.vendor_id FROM vendors v JOIN users u ON v.user_id = u.user_id WHERE u.email = ?",
      [sampleVendorEmail]
    );
    let sampleVendorId = existingVendor[0]?.vendor_id;
    
    if (!existingVendor.length) {
      const hashedVendor = await bcrypt.hash(sampleVendorPass, 10);
      
      // 1. Ensure the user exists first in the users table
      const [existingUser] = await db.query("SELECT user_id FROM users WHERE email = ?", [sampleVendorEmail]);
      let userId;
      if (!existingUser.length) {
        const [uResult] = await db.query(
          `INSERT INTO users (first_name, last_name, email, password_hash, role, status, created_at)
           VALUES (?, ?, ?, ?, 'vendor', 'active', NOW())`,
          ["Sample", "Vendor", sampleVendorEmail, hashedVendor]
        );
        userId = uResult.insertId;
        console.log(`✅ Created users.user_id=${userId}`);
      } else {
        userId = existingUser[0].user_id;
      }

      // 2. Create the vendor details record linked to the user
      const [vResult] = await db.query(
        "INSERT INTO vendors (user_id, name, company_name, phone_number, shop_address, specialization, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
        [userId, "Sample Vendor", "Sample Co", "1234567890", "123 Main St", "Varsity"]
      );
      sampleVendorId = vResult.insertId;
      console.log(`✅ Seeded sample vendor linked to ${sampleVendorEmail}`);
    } else {
      console.log("ℹ️ Sample vendor already exists, checking for user link...");
      const [[vendorRow]] = await db.query(
        "SELECT v.vendor_id, v.user_id FROM vendors v JOIN users u ON v.user_id = u.user_id WHERE u.email = ?",
        [sampleVendorEmail]
      );
      // Link user if missing due to legacy code migration
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
        } else {
          await db.query("UPDATE vendors SET user_id = ? WHERE vendor_id = ?", [existingUser[0].user_id, vendorRow.vendor_id]);
        }
      }
    }

    // --- Seed test users (Alice, Bob, Charlie, Dave, Eve, Frank) ---
    // Loop over the list of names and create accounts for them
    for (const user of testUsers) {
      // Check if they exist
      const [existing] = await db.query("SELECT user_id FROM users WHERE email = ?", [user.email]);
      let userId;
      if (existing.length === 0) {
        // Insert into users table
        const [result] = await db.query(
          "INSERT INTO users (first_name, last_name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'active')",
          [user.first, user.last, user.email, password_hash, user.role]
        );
        userId = result.insertId;
        console.log(`✅ Seeded user: ${user.email}`);
      } else {
        userId = existing[0].user_id;
        console.log(`ℹ️ User ${user.email} already exists.`);
      }

      // Check / Insert into their specific role details table (customers/vendors/suppliers)
      if (user.role === "customer") {
        const [existCust] = await db.query("SELECT customer_id FROM customers WHERE user_id = ?", [userId]);
        if (!existCust.length) {
          await db.query(
            "INSERT INTO customers (user_id, phone_number, address, city, country) VALUES (?, ?, ?, ?, ?)",
            [userId, "1234567890", "123 Customer St", "Test City", "Test Country"]
          );
        }
      } else if (user.role === "vendor") {
        const [existVend] = await db.query("SELECT vendor_id FROM vendors WHERE user_id = ?", [userId]);
        if (!existVend.length) {
          await db.query(
            "INSERT INTO vendors (user_id, name, email, password, company_name) VALUES (?, ?, ?, ?, ?)",
            [userId, `${user.first} ${user.last}`, user.email, password_hash, `${user.first} Workshop`]
          );
        }
      } else if (user.role === "supplier") {
        const [existSupp] = await db.query("SELECT supplier_id FROM suppliers WHERE user_id = ?", [userId]);
        if (!existSupp.length) {
          await db.query(
            "INSERT INTO suppliers (user_id, approved, business_registration_number, phone, address) VALUES (?, 1, ?, ?, ?)",
            [userId, `BRN-${userId}000`, "0987654321", "123 Supplier Ave"]
          );
        }
      }
    }

    // --- Seed Fake Vendor Products ---
    // If we successfully created the sample vendor, let's give them some products to sell
    if (sampleVendorId) {
      // Check if they already have products
      const [existingSampleProd] = await db.query("SELECT COUNT(*) as count FROM vendor_products WHERE vendor_id = ?", [sampleVendorId]);
      if (existingSampleProd[0].count === 0) {
        // List of fake products
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
        // Insert them into the database
        for (const p of sampleProducts) {
          await db.query(`
            INSERT INTO vendor_products (vendor_id, name, price, stock, category, image, status)
            VALUES (?, ?, ?, ?, ?, ?, 'Active')
          `, [sampleVendorId, p.name, p.price, p.stock, p.category, p.image]);
        }
        console.log(`✅ Seeded ${sampleProducts.length} products for sample vendor.`);
      }
    }

    // Give Charlie some products too
    const [charlieVendor] = await db.query(
      "SELECT v.vendor_id FROM vendors v JOIN users u ON v.user_id = u.user_id WHERE u.email = 'charlie.vend@test.com'"
    );
    if (charlieVendor.length > 0) {
      const charlieId = charlieVendor[0].vendor_id;
      const [existingCharlieProd] = await db.query("SELECT COUNT(*) as count FROM vendor_products WHERE vendor_id = ?", [charlieId]);
      if (existingCharlieProd[0].count === 0) {
        await db.query(`
          INSERT INTO vendor_products (vendor_id, name, price, stock, category, image, status)
          VALUES 
          (?, 'Charlie Custom Bomber Jacket', 120.00, 50, 'Bomber', 'https://images.unsplash.com/photo-1591561954557-26941169b49e', 'Active'),
          (?, 'Charlie Denim Streetwear', 150.00, 30, 'Denim', 'https://images.unsplash.com/photo-1591561954557-26941169b49e', 'Active')
        `, [charlieId, charlieId]);
        console.log("✅ Seeded products for Charlie Vendor.");
      }
    }

    // Give Dave some products too
    const [daveVendor] = await db.query(
      "SELECT v.vendor_id FROM vendors v JOIN users u ON v.user_id = u.user_id WHERE u.email = 'dave.vend@test.com'"
    );
    if (daveVendor.length > 0) {
      const daveId = daveVendor[0].vendor_id;
      const [existingDaveProd] = await db.query("SELECT COUNT(*) as count FROM vendor_products WHERE vendor_id = ?", [daveId]);
      if (existingDaveProd[0].count === 0) {
        await db.query(`
          INSERT INTO vendor_products (vendor_id, name, price, stock, category, image, status)
          VALUES 
          (?, 'Dave Classic Leather Jacket', 200.00, 20, 'Leather', 'https://images.unsplash.com/photo-1551028719-00167b16eac5', 'Active'),
          (?, 'Dave Varsity Style Jacket', 180.00, 40, 'Varsity', 'https://images.unsplash.com/photo-1551028719-00167b16eac5', 'Active')
        `, [daveId, daveId]);
        console.log("✅ Seeded products for Dave Vendor.");
      }
    }

    // --- Seed Supplier Inventory for all suppliers ---
    // Fake raw materials for suppliers to offer to vendors
    const sampleInventoryItems = [
      { name: "Metal Buttons", type: "Accessories", size: "15mm", price: 5.00, stock: 2000, image: "https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&q=80&w=200" },
      { name: "Heavy Duty YKK Zipper", type: "Fasteners", size: "30cm", price: 45.00, stock: 500, image: "https://images.unsplash.com/photo-1594540911438-27517c24483a?auto=format&fit=crop&q=80&w=200" },
      { name: "Premium Calf Leather", type: "Fabric", size: "10 sq ft", price: 1500.00, stock: 100, image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=200" },
      { name: "Organic Indigo Denim Fabric", type: "Fabric", size: "50m roll", price: 8500.00, stock: 25, image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&q=80&w=200" },
      { name: "High Tenacity Thread", type: "Threads", size: "5000m spool", price: 250.00, stock: 150, image: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&q=80&w=200" }
    ];

    // Find all suppliers and give them the fake inventory
    const [suppliersList] = await db.query("SELECT supplier_id FROM suppliers");
    for (const s of suppliersList) {
      const [existingCount] = await db.query("SELECT COUNT(*) as count FROM supplier_inventory WHERE supplier_id = ?", [s.supplier_id]);
      // Only insert if their inventory is completely empty
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
    process.exit(0); // Success
  } catch (err) {
    console.error("❌ Database initialization failed:", err);
    process.exit(1); // Error
  }
}

// Run the function we just built
run();