import db from "./src/lib/db.js";
import bcrypt from "bcryptjs";

async function addTestUsers() {
  try {
    const defaultPassword = "password123";
    const password_hash = await bcrypt.hash(defaultPassword, 10);

    const testUsers = [
      { role: "customer", first: "Alice", last: "Customer", email: "alice.cust@test.com" },
      { role: "customer", first: "Bob", last: "Customer", email: "bob.cust@test.com" },
      { role: "vendor", first: "Charlie", last: "Vendor", email: "charlie.vend@test.com" },
      { role: "vendor", first: "Dave", last: "Vendor", email: "dave.vend@test.com" },
      { role: "supplier", first: "Eve", last: "Supplier", email: "eve.supp@test.com" },
      { role: "supplier", first: "Frank", last: "Supplier", email: "frank.supp@test.com" },
    ];

    for (const user of testUsers) {
      // Check if exists
      const [existing] = await db.query("SELECT user_id FROM users WHERE email = ?", [user.email]);
      if (existing.length > 0) {
        console.log(`User ${user.email} already exists.`);
        continue;
      }

      // Insert into users table
      const [result] = await db.query(
        "INSERT INTO users (first_name, last_name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'active')",
        [user.first, user.last, user.email, password_hash, user.role]
      );
      const userId = result.insertId;

      // Insert into specific role table
      if (user.role === "customer") {
        await db.query(
          "INSERT INTO customers (user_id, phone_number, address, city, country) VALUES (?, ?, ?, ?, ?)",
          [userId, "1234567890", "123 Customer St", "Test City", "Test Country"]
        );
      } else if (user.role === "vendor") {
        await db.query(
          "INSERT INTO vendors (user_id, name, email, password, company_name) VALUES (?, ?, ?, ?, ?)",
          [userId, `${user.first} ${user.last}`, user.email, password_hash, `${user.first} Workshop`]
        );
      } else if (user.role === "supplier") {
        await db.query(
          "INSERT INTO suppliers (user_id, approved, business_registration_number, phone, address) VALUES (?, 1, ?, ?, ?)",
          [userId, `BRN-${userId}000`, "0987654321", "123 Supplier Ave"]
        );
      }
      
      console.log(`Successfully added ${user.role}: ${user.email}`);
    }

    console.log("All test users added successfully! The password for all accounts is: " + defaultPassword);
    process.exit(0);
  } catch (err) {
    console.error("Error adding test users:", err);
    process.exit(1);
  }
}

addTestUsers();
