
import { NextResponse } from "next/server";
import db from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * @file route.js
 * @description Admin Profile API.
 * Fetches the currently logged-in admin's profile information.
 */

export const dynamic = 'force-dynamic';

/**
 * GET handler to retrieve admin profile.
 * Validates the JWT token before fetching data.
 */
export async function GET(req) {
    try {
        const adminAuth = getUserFromRequest(req);
        // Note: adminAuth comes from token, which has { id, role, email }.
        // admin table uses 'admin_id'. authmiddleware used 'id'.
        // getUserFromRequest returns decoded token.
        // The admin login endpoint signed { id: admin.admin_id }.
        // So adminAuth.id IS admin_id.

        if (adminAuth.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const [rows] = await db.query("SELECT name, email FROM admins WHERE admin_id = ?", [adminAuth.id]);

        if (rows.length === 0) {
            return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }

        return NextResponse.json(rows[0]);

    } catch (err) {
        console.error("Admin Profile error:", err.message);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
