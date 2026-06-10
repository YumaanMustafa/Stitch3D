import { NextResponse } from "next/server";
import { getAdminFromRequest } from '@/lib/auth';
import db from '@/lib/db';

/**
 * @file route.js
 * @description Admin Complaints List API.
 */

export async function GET(req) {
    try {
        const adminPayload = getAdminFromRequest(req);
        if (!adminPayload) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Fetch complaints with user names for admin view
        const [complaints] = await db.query(`
            SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) as user_name 
            FROM complaints c
            JOIN users u ON c.user_id = u.user_id
            ORDER BY c.created_at DESC
        `);

        return NextResponse.json(complaints);

    } catch (err) {
        console.error("Admin Complaints GET error:", err.message);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
