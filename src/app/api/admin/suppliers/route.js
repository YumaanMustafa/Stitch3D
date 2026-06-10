import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getUserFromRequest } from '@/lib/auth';

/**
 * @file route.js
 * @description Admin Supplier List & Creation API.
 * - GET: List all suppliers (excluding unverified emails).
 * - POST: Manually create a new supplier (Admin action).
 */

export const dynamic = 'force-dynamic';

/**
 * GET handler to fetch all suppliers.
 */
export async function GET(request) {
    try {
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        try {
            // Fetch suppliers joined with user status and company name (from first_name)
            const [suppliers] = await db.query(`
            SELECT s.*, u.status as user_status, u.first_name as company_name
            FROM suppliers s 
            LEFT JOIN users u ON s.user_id = u.user_id
            WHERE u.status != 'unverified_email'
            ORDER BY s.created_at DESC
        `);
            return NextResponse.json(suppliers);
        } catch (error) {
            console.error(error);
            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }
    } catch (error) {
        console.error("Supplier GET error:", error);
        return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
        const body = await request.json();
        const { registrationNumber, email, password, phone, address } = body;

        // Create Supplier manually
        const hash = await bcrypt.hash(password, 10);

        // 1. Create User
        const [uResult] = await db.query(
            `INSERT INTO users (first_name, email, password_hash, role, status, created_at)
           VALUES (?, ?, ?, 'supplier', 'active', NOW())`,
            [registrationNumber, email, hash]
        );

        // 2. Create Supplier
        const [sResult] = await db.query(
            "INSERT INTO suppliers (user_id, business_registration_number, phone, address, created_at) VALUES (?, ?, ?, ?, NOW())",
            [uResult.insertId, registrationNumber, phone, address]
        );

        return NextResponse.json({
            supplier_id: sResult.insertId,
            registrationNumber, email,
            created_at: new Date()
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Creation failed" }, { status: 500 });
    }
}
