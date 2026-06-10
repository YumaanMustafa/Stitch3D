import db from "../lib/db.js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const API_URL = "http://localhost:3000/api";

async function verifyAdmin() {
    console.log("🔍 Checking 'admins' table...");
    try {
        const [admins] = await db.query("SELECT admin_id, name, email FROM admins");
        if (admins.length === 0) {
            console.error("❌ No admins found in database!");
            return;
        }
        console.log(`✅ Found ${admins.length} admin(s):`, admins);

        const email = admins[0].email;
        const password = "admin"; // Try default first, or "admin123"

        console.log(`\n🔑 Attempting login for ${email} with password '${password}'...`);
        try {
            const loginRes = await axios.post(`${API_URL}/admin/login`, { email, password });
            console.log("✅ Login Successful!");
            const token = loginRes.data.token;
            console.log("Token:", token.substring(0, 20) + "...");

            console.log("\n📡 Fetching Profile...");
            try {
                const profileRes = await axios.get(`${API_URL}/admin/profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log("✅ Profile Fetched:", profileRes.data);
            } catch (profileErr) {
                console.error("❌ Profile Fetch Failed:", profileErr.response?.data || profileErr.message);
            }

        } catch (loginErr) {
            console.error("❌ Login Failed. Trying password 'admin123'...");
            try {
                const loginRes2 = await axios.post(`${API_URL}/admin/login`, { email, password: "admin123" });
                console.log("✅ Login Successful with 'admin123'!");
                const token = loginRes2.data.token;

                console.log("\n📡 Fetching Profile...");
                const profileRes = await axios.get(`${API_URL}/admin/profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log("✅ Profile Fetched:", profileRes.data);

            } catch (loginErr2) {
                console.error("❌ Login Failed with 'admin123' too:", loginErr2.response?.data || loginErr2.message);
            }
        }

    } catch (err) {
        console.error("Database error:", err);
    } finally {
        process.exit();
    }
}

verifyAdmin();
