// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import jsonwebtoken to read login tokens
import jwt from 'jsonwebtoken';
// Import bcryptjs for checking and hashing passwords
import bcrypt from 'bcryptjs';

/**
 * File: route.js
 * Location: src/app/api/supplier/settings/route.js
 * Description: Supplier Settings API.
 * This allows a supplier to view and edit their profile details 
 * (like name and business registration number) and change their password.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// ==========================================
// HELPER FUNCTION: Verify Token
// ==========================================
async function getSupplierFromToken(request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'supplier') return null;
        return decoded;
    } catch (err) {
        return null;
    }
}

// ==========================================
// GET HANDLER: Handles GET requests to load the supplier's current settings
// ==========================================
export async function GET(request) {
    try {
        // Step 1: Security Check
        const decoded = await getSupplierFromToken(request);
        if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Fetch their details
        // We use a JOIN to combine their basic 'users' table info (like name) 
        // with their specific 'suppliers' table info (like registration number).
        const [suppliers] = await db.query(`
            SELECT u.first_name, u.last_name, u.email, s.business_registration_number
            FROM users u
            JOIN suppliers s ON u.user_id = s.user_id
            WHERE s.supplier_id = ?
        `, [decoded.id]);

        if (!suppliers.length) {
            return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
        }

        const supplier = suppliers[0];
        
        // Step 3: Format the data and send it to the browser
        return NextResponse.json({
            // Combine first and last name into one string
            name: `${supplier.first_name} ${supplier.last_name}`.trim(),
            email: supplier.email,
            business_registration_number: supplier.business_registration_number || ""
        });
        
    } catch (error) {
        console.error("Supplier Settings GET Error:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

// ==========================================
// PUT HANDLER: Handles PUT requests when the supplier saves new settings
// ==========================================
export async function PUT(request) {
    try {
        // Step 1: Security Check
        const decoded = await getSupplierFromToken(request);
        if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Read the new data they typed into the settings form
        const body = await request.json();
        const { name, business_registration_number, password, newPassword } = body;

        // Step 3: Password Change Logic
        // Fetch their current scrambled password from the database
        const [userRows] = await db.query("SELECT password_hash FROM users WHERE user_id = (SELECT user_id FROM suppliers WHERE supplier_id = ?)", [decoded.id]);
        const user = userRows[0];

        // If they filled out the "New Password" box...
        if (newPassword && password) {
            // ...they MUST also provide their current password, and it must match!
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
            }
        } else if (newPassword && !password) {
            // If they didn't provide their current password, block the change.
            return NextResponse.json({ error: "Current password is required to set a new one" }, { status: 400 });
        }

        // Step 4: Process Name Changes
        // Split their single "name" string back into a first_name and last_name
        const nameParts = (name || "").trim().split(/\s+/);
        const first_name = nameParts[0] || "";
        const last_name = nameParts.slice(1).join(" ") || "";

        // Step 5: Update the 'users' table
        let updateUsersQuery = "UPDATE users SET first_name = ?, last_name = ?";
        let userParams = [first_name, last_name];

        // If they successfully changed their password, add that to the update query
        if (newPassword) {
            const hashed = await bcrypt.hash(newPassword, 10);
            updateUsersQuery += ", password_hash = ?";
            userParams.push(hashed);
        }

        updateUsersQuery += " WHERE user_id = (SELECT user_id FROM suppliers WHERE supplier_id = ?)";
        userParams.push(decoded.id);

        // Execute the user table update
        await db.query(updateUsersQuery, userParams);

        // Step 6: Update the 'suppliers' table
        // Update their specific business details
        await db.query(`
            UPDATE suppliers 
            SET business_registration_number = ? 
            WHERE supplier_id = ?
        `, [business_registration_number || "", decoded.id]);

        // Tell the browser everything was saved
        return NextResponse.json({ success: true, message: "Settings updated successfully" });
        
    } catch (error) {
        console.error("Supplier Settings PUT Error:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
