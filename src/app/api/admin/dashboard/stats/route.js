
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * @file route.js
 * @description Admin Dashboard Statistics API.
 * Returns counts for Vendors, Customers, Suppliers, and Pending Approvals.
 */

export const dynamic = 'force-dynamic';

/**
 * GET handler to fetch dashboard stats.
 * @param {Request} request 
 */
export async function GET(request) {
    try {
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Run queries in parallel for efficiency
        // Run queries in parallel for efficiency
        const [vendorsRes] = await db.query("SELECT COUNT(*) as count FROM vendors");
        const [usersRes] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'customer'");

        // New stats requested by user
        const [suppliersRes] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'supplier'");
        const [pendingVendorsRes] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'vendor' AND status = 'pending'");

        return NextResponse.json({
            vendors: vendorsRes[0].count,
            users: usersRes[0].count,
            suppliers: suppliersRes[0].count,
            pendingVendors: pendingVendorsRes[0].count
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error.message);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: error.message === "Missing or invalid Authorization header" ? 401 : 500 });
    }
}
