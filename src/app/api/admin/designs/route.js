// Import Next.js response tool
import { NextResponse } from 'next/server';
// Import the database connection tool
import db from '@/lib/db';
// Import jsonwebtoken to manually verify tokens
import jwt from 'jsonwebtoken';

/**
 * File: route.js
 * Location: src/app/api/admin/designs/route.js
 * Description: Admin Design Requests API.
 * This route fetches a complete list of all design requests (custom jackets 
 * created by customers) so the Admin can oversee them. It links the request 
 * to both the Customer who made it and the Vendor who is supposed to build it.
 */

// ==========================================
// HELPER FUNCTION: Verify Admin
// ==========================================
// Checks if the user is an admin based on their token
async function verifyAdmin(request) {
    const authHeader = request.headers.get("authorization");
    
    // Stop if no token provided
    if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
    
    try {
        const token = authHeader.split(" ")[1];
        // Decrypt the token and check the role
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        return decoded.role === 'admin';
    } catch { 
        return false; 
    }
}

// ==========================================
// GET HANDLER: Handles GET requests when Admin loads the designs page
// ==========================================
export async function GET(request) {
    // Step 1: Security check using the helper function
    if (!await verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Step 2: Fetch the designs from the database
        // We use "LEFT JOIN" twice here:
        // 1. To get the customer's name and email from the 'users' table
        // 2. To get the manufacturer's name from the 'vendors' table
        // We order by newest first (DESC)
        const [requests] = await db.query(`
            SELECT 
                dr.request_id,
                dr.title,
                dr.status,
                dr.created_at,
                u.first_name as user_name,
                u.last_name as user_surname,
                u.email as user_email,
                v.name as vendor_name,
                v.vendor_id
            FROM design_requests dr
            LEFT JOIN users u ON dr.user_id = u.user_id
            LEFT JOIN vendors v ON dr.vendor_id = v.vendor_id
            ORDER BY dr.created_at DESC
        `);

        // Step 3: Send the combined data back to the dashboard
        return NextResponse.json(requests);

    } catch (error) {
        // Log any server crashes securely
        console.error("Admin Designs Error:", error);
        return NextResponse.json({ error: "Failed to fetch designs" }, { status: 500 });
    }
}
