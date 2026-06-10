import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

/**
 * @file route.js
 * @description Admin Design Requests API.
 * Fetches a list of all design requests joined with user and vendor details.
 */

async function verifyAdmin(request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
    try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        return decoded.role === 'admin';
    } catch { return false; }
}

export async function GET(request) {
    if (!await verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Fetch all design requests with User and Vendor details
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
        return NextResponse.json(requests);
    } catch (error) {
        console.error("Admin Designs Error:", error);
        return NextResponse.json({ error: "Failed to fetch designs" }, { status: 500 });
    }
}
