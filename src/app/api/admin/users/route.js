
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * @file route.js
 * @description Admin User List API.
 * Fetches all users (Customers and Active Vendors) for the admin dashboard.
 */

export const dynamic = 'force-dynamic';

/**
 * GET handler to retrieve list of users.
 * Filters out unverified or pending vendors to show only active participants.
 */
export async function GET(request) {
    try {
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

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

        // Map names and handle company display logic
        const mappedUsers = users.map(u => ({
            ...u,
            name: (u.first_name || u.last_name) ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : (u.name || 'Unknown'),
            company_name: u.role === 'vendor' ? u.vendor_company : (u.role === 'supplier' ? u.first_name : null)
        }));

        return NextResponse.json(mappedUsers);
    } catch (error) {
        console.error("Admin Users Error:", error.message);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: error.message === "Missing or invalid Authorization header" ? 401 : 500 });
    }
}
