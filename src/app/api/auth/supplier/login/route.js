import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * @file route.js
 * @description Supplier Login API.
 * Authenticates suppliers and enforces status checks (Pending, Rejected, Banned).
 * Ensures suppliers cannot login until approved by Admin.
 */

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ message: "Missing credentials" }, { status: 400 });
        }

        // 1. Find user by email and role
        const [users] = await db.execute("SELECT * FROM users WHERE email = ? AND role = 'supplier'", [email]);

        if (users.length === 0) {
            return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
        }

        const user = users[0];

        // 2. Check Password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
        }

        // 3. Check User Status
        const status = (user.status || 'pending').toLowerCase();

        // ENFORCE STATUS CHECKS
        if (status === 'pending') {
            return NextResponse.json({
                message: "Your application is currently pending approval. Please check back later.",
                user: { status: 'pending', email: user.email }
            }, { status: 403 });
        }

        if (status === 'rejected') {
            return NextResponse.json({
                message: "Your supplier application has been rejected. Please contact support.",
                user: { status: 'rejected', email: user.email }
            }, { status: 403 });
        }

        if (status === 'banned') {
            return NextResponse.json({
                message: "Your account has been suspended.",
                user: { status: 'banned', email: user.email }
            }, { status: 403 });
        }

        if (status === 'unverified_email') {
            return NextResponse.json({
                message: "Please verify your email address to continue.",
                user: { status: 'unverified_email', email: user.email }
            }, { status: 403 });
        }

        // 4. Fetch supplier_id
        const [suppliers] = await db.execute("SELECT supplier_id FROM suppliers WHERE user_id = ?", [user.user_id]);
        const supplierId = suppliers[0]?.supplier_id;

        // 5. Generate Token
        // Notice we are matching the vendor token structure but using supplier_id
        const token = jwt.sign(
            { id: supplierId, role: 'supplier', email: user.email },
            process.env.JWT_SECRET || 'your_jwt_secret_key',
            { expiresIn: '1d' }
        );

        return NextResponse.json({
            message: "Login successful",
            token,
            user: {
                email: user.email,
                status,
                name: user.first_name || user.last_name || 'Supplier'
            }
        }, { status: 200 });

    } catch (error) {
        console.error("Supplier Login Error:", error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
