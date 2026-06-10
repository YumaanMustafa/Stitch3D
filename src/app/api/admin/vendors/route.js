import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getUserFromRequest } from '@/lib/auth';

/**
 * @file route.js
 * @description Admin Vendor List & Creation API.
 * - GET: List all vendors (excluding unverified emails).
 * - POST: Manually create a new vendor (Admin action).
 */

export const dynamic = 'force-dynamic';

/**
 * GET handler to fetch all vendors.
 */
export async function GET(request) {
    try {
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        try {
            // Fetch vendors joined with user status
            const [vendors] = await db.query(`
            SELECT v.*, u.status as user_status 
            FROM vendors v 
            LEFT JOIN users u ON v.user_id = u.user_id
            WHERE u.status != 'unverified_email'
            ORDER BY v.created_at DESC
        `);
            console.log("Admin Vendor GET Fetch:", vendors.map(v => ({ id: v.vendor_id, uid: v.user_id, status: v.user_status })));
            return NextResponse.json(vendors);
        } catch (error) {
            console.error(error);
            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }
    } catch (error) {
        console.error("Vendor GET error:", error);
        return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
        const body = await request.json();
        const { name, email, password, company_name } = body;

        // Create Vendor manually
        const hash = await bcrypt.hash(password, 10);

        // 1. Create User
        const [uResult] = await db.query(
            `INSERT INTO users (first_name, email, password_hash, role, status, created_at)
           VALUES (?, ?, ?, 'vendor', 'active', NOW())`,
            [name, email, hash]
        );

        // 2. Create Vendor
        const [vResult] = await db.query(
            "INSERT INTO vendors (name, email, password, company_name, user_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
            [name, email, hash, company_name, uResult.insertId]
        );

        return NextResponse.json({
            vendor_id: vResult.insertId,
            name, email, company_name,
            created_at: new Date()
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Creation failed" }, { status: 500 });
    }
}
