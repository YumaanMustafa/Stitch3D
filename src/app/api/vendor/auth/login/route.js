
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * @file route.js
 * @description Vendor Login API (Alternative/Legacy).
 * Authenticates vendor credentials.
 * @warning This endpoint does NOT check for 'pending' or 'banned' status. 
 * Use `api/auth/vendor/login` for strict status enforcement.
 */

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password required" }, { status: 400 });
        }

        const [rows] = await db.query("SELECT * FROM vendors WHERE email = ?", [email]);
        if (!rows || rows.length === 0) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const vendor = rows[0];
        const match = await bcrypt.compare(password, vendor.password);
        if (!match) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        if (vendor.user_id) {
            const [users] = await db.query("SELECT role FROM users WHERE user_id = ?", [vendor.user_id]);
            if (users.length > 0 && users[0].role !== 'vendor') {
                return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
            }
        }

        const token = jwt.sign(
            { id: vendor.vendor_id, role: "vendor", email: vendor.email },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: "1h" }
        );

        return NextResponse.json({ token });
    } catch (error) {
        console.error("Vendor Login Error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
