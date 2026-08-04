// Import Next.js tool for sending responses back to the browser
import { NextResponse } from "next/server";
// Import our custom auth tool to check if the user is an admin
import { getAdminFromRequest } from '@/lib/auth';
// Import the database connection tool
import db from '@/lib/db';

/**
 * File: route.js
 * Location: src/app/api/admin/complaints/route.js
 * Description: Admin Complaints List API Endpoint.
 * This route allows the Admin to view a list of all complaints or support 
 * tickets submitted by users on the platform.
 */

// ==========================================
// GET HANDLER: Handles GET requests when the Admin loads the complaints page
// ==========================================
export async function GET(req) {
    try {
        // Step 1: Security Check. Make sure the person asking is an Admin.
        const adminPayload = getAdminFromRequest(req);
        
        // If they are not an admin (or not logged in), block them
        if (!adminPayload) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Step 2: Fetch all complaints from the database
        // We use a "JOIN" to get the user's first and last name from the 'users' table, 
        // because the 'complaints' table only stores their user_id number.
        // We order them by 'created_at DESC' so the newest complaints show up first at the top.
        const [complaints] = await db.query(`
            SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) as user_name 
            FROM complaints c
            JOIN users u ON c.user_id = u.user_id
            ORDER BY c.created_at DESC
        `);

        // Step 3: Send the list of complaints back to the Admin dashboard
        return NextResponse.json(complaints);

    } catch (err) {
        // Log any server crashes securely
        console.error("Admin Complaints GET error:", err.message);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
