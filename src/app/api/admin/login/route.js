import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * @file route.js
 * @description Admin Login API.
 * Authenticates admin credentials (email/password) and issues a JWT token.
 */

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ message: "Missing credentials" }, { status: 400 });
        }

        // 1. Find admin
        const [admins] = await db.execute("SELECT * FROM admins WHERE email = ?", [email]);

        if (admins.length === 0) {
            return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
        }

        const admin = admins[0];

        // 2. Check Password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
        }

        // 3. Generate Token
        // Use a distinct secret or namespace if possible, but sharing for simplicity is fine for MVP
        // provided roles are checked.
        const token = jwt.sign(
            { id: admin.admin_id, role: 'admin', email: admin.email },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1d' }
        );

        return NextResponse.json({
            message: "Login successful",
            token,
            admin: {
                id: admin.admin_id,
                email: admin.email,
                name: admin.name
            }
        }, { status: 200 });

    } catch (error) {
        console.error("Admin Login Error:", error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
