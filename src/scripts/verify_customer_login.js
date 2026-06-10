import db from "../lib/db.js";
import axios from "axios";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const API_URL = "http://localhost:3000/api";
const EMAIL = "debug_customer@stitch.com";
const PASSWORD = "password123";

async function verifyCustomer() {
    console.log("🔍 Starting Customer Verification...");

    try {
        // 1. Ensure test user exists or create one
        console.log(`\n🧹 Cleaning up old debug user ${EMAIL}...`);
        const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [EMAIL]);
        if (existing.length > 0) {
            await db.query("DELETE FROM users WHERE email = ?", [EMAIL]);
        }

        console.log("📝 Creating new customer...");
        // Manually insert to skip email verification needed for login
        const hashed = await bcrypt.hash(PASSWORD, 10);
        const [res] = await db.query(
            "INSERT INTO users (first_name, last_name, email, password_hash, role, status) VALUES (?, ?, ?, ?, 'customer', 'active')",
            ["Debug", "User", EMAIL, hashed]
        );
        const userId = res.insertId;
        await db.query("INSERT INTO customers (user_id) VALUES (?)", [userId]);
        console.log("✅ Customer created with ID:", userId);

        // 2. Login
        console.log("\n🔑 Attempting Login...");
        try {
            const loginRes = await axios.post(`${API_URL}/auth/login`, { email: EMAIL, password: PASSWORD });
            const token = loginRes.data.token;
            console.log("✅ Login Successful! Token:", token.substring(0, 15) + "...");

            // 3. Fetch Profile
            console.log("\n📡 Fetching Profile (/api/auth/profile)...");
            try {
                const profileRes = await axios.get(`${API_URL}/auth/profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log("✅ Profile Fetched:", profileRes.data);
            } catch (profErr) {
                console.error("❌ Profile Fetch Failed:", profErr.response?.data || profErr.message);
                console.error("Status:", profErr.response?.status);
            }

        } catch (loginErr) {
            console.error("❌ Login Failed:", loginErr.response?.data || loginErr.message);
        }

    } catch (err) {
        console.error("Database error:", err);
    } finally {
        process.exit();
    }
}

verifyCustomer();
