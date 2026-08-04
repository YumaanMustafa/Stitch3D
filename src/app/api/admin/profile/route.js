// Import Next.js tool for sending responses
import { NextResponse } from "next/server";
// Import the database connection tool
import db from '@/lib/db';
// Import our custom auth tool to check tokens
import { getUserFromRequest } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/admin/profile/route.js
 * Description: Admin Profile API.
 * This route fetches the basic information (like name and email) of the 
 * currently logged-in Admin so it can be displayed in the top right corner of the dashboard.
 */

// This tells Next.js not to cache the result, ensuring the admin always sees up-to-date info
export const dynamic = 'force-dynamic';

// ==========================================
// GET HANDLER: Handles GET requests when the Admin Profile loads
// ==========================================
export async function GET(req) {
    try {
        // Step 1: Get the admin's details from their login token
        const adminAuth = getUserFromRequest(req);
        
        // Note: adminAuth comes from the token, which contains { id, role, email }.
        // When the admin logged in, we stored their 'admin_id' under the name 'id'.

        // Step 2: Security Check. Double check that they actually have the 'admin' role
        if (adminAuth.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Step 3: Look up their name and email from the 'admins' table
        const [rows] = await db.query("SELECT name, email FROM admins WHERE admin_id = ?", [adminAuth.id]);

        // If they were somehow deleted from the database while logged in, return a 404 error
        if (rows.length === 0) {
            return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }

        // Step 4: Send their profile details back to the dashboard
        return NextResponse.json(rows[0]);

    } catch (err) {
        // Log any server crashes securely
        console.error("Admin Profile error:", err.message);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
