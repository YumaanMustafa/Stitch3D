// Import Next.js response tool
import { NextResponse } from 'next/server';
// Import the database connection tool
import db from '@/lib/db';
// Import our custom auth tool
import { getUserFromRequest } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/admin/dashboard/stats/route.js
 * Description: Admin Dashboard Statistics API.
 * This route fetches the total numbers (counts) of Users, Vendors, Suppliers, 
 * and Pending Vendor approvals to display as summary cards at the top of the Admin dashboard.
 */

// This tells Next.js not to cache this page. 
// We want live, fresh numbers every time the admin refreshes.
export const dynamic = 'force-dynamic';

// ==========================================
// GET HANDLER: Handles GET requests when the Admin Dashboard loads
// ==========================================
export async function GET(request) {
    try {
        // Step 1: Security Check
        const admin = getUserFromRequest(request);
        
        // Stop if they are not an admin
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Step 2: Ask the database to count everything
        // Note: We use 'await' on these sequentially, which is fine, but they could be 
        // run in parallel with Promise.all() for slightly faster performance.

        // Count all vendors
        const [vendorsRes] = await db.query("SELECT COUNT(*) as count FROM vendors");
        
        // Count only standard customers
        const [usersRes] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'customer'");

        // Count only raw material suppliers
        const [suppliersRes] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'supplier'");
        
        // Count vendors who just signed up and are waiting for admin approval
        const [pendingVendorsRes] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'vendor' AND status = 'pending'");

        // Step 3: Package all the numbers into one neat JSON object and send it back
        return NextResponse.json({
            vendors: vendorsRes[0].count,
            users: usersRes[0].count,
            suppliers: suppliersRes[0].count,
            pendingVendors: pendingVendorsRes[0].count
        });

    } catch (error) {
        // Log errors securely. If the token was missing, return 401 Unauthorized instead of a generic 500 server error.
        console.error("Dashboard Stats Error:", error.message);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: error.message === "Missing or invalid Authorization header" ? 401 : 500 });
    }
}
