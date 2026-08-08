// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database connection tool
import db from '@/lib/db';
// Import our custom auth tool to verify admin access
import { getUserFromRequest } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/admin/users/route.js
 * Description: Admin User List API.
 * This route fetches a giant list of EVERY user in the system (Customers, 
 * Vendors, and Suppliers) so the Admin can view them in a master table.
 */

// Prevent Next.js from caching this page so the list is always perfectly up to date
export const dynamic = 'force-dynamic';

// ==========================================
// GET HANDLER: Handles GET requests when the Admin opens the 'Users' page
// ==========================================
export async function GET(request) {
    try {
        // Step 1: Security Check
        // PRIVILEGE 1: Global User Visibility
        // Only Admins have the global privilege to fetch the entire user directory.
        // We strictly check the token to ensure the role is 'admin'.
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Step 2: Fetch all users from the database
        // We use "LEFT JOIN" twice because a single user might have extra data stored 
        // in the 'vendors' table OR the 'suppliers' table depending on their role.
        const [users] = await db.query(`
            SELECT 
                u.user_id, u.first_name, u.last_name, u.email, u.role, u.created_at, u.status, 
                u.deletion_requested_at, u.deletion_reason,
                v.company_name AS vendor_company, 
                s.business_registration_number AS supplier_reg
            FROM users u 
            LEFT JOIN vendors v ON u.user_id = v.user_id 
            LEFT JOIN suppliers s ON u.user_id = s.user_id
            WHERE u.role IN ('customer', 'vendor', 'supplier')
            ORDER BY u.created_at DESC
        `);

        // Step 3: Clean up the data before sending it to the frontend
        // We map (loop) through the list to fix formatting issues, like combining 
        // first and last names, and figuring out what to call the "company".
        const mappedUsers = users.map(u => ({
            ...u, // Keep all original data
            
            // Try to combine first and last name. If they are missing, use 'name', or default to 'Unknown'
            name: (u.first_name || u.last_name) ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : (u.name || 'Unknown'),
            
            // Vendors use 'vendor_company', Suppliers use 'first_name' for company name
            company_name: u.role === 'vendor' ? u.vendor_company : (u.role === 'supplier' ? u.first_name : null)
        }));

        // Step 4: Send the cleaned-up list back to the admin dashboard
        return NextResponse.json(mappedUsers);
        
    } catch (error) {
        // Log errors securely. If it was an auth issue, send a 401 Unauthorized status. Otherwise send a 500 Server error.
        console.error("Admin Users Error:", error.message);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: error.message === "Missing or invalid Authorization header" ? 401 : 500 });
    }
}
