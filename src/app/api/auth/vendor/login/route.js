import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * @file route.js
 * @description Vendor Login API.
 * Authenticates vendors and enforces status checks (Pending, Rejected, Banned).
 * Ensures vendors cannot login until approved by Admin.
 */

// ==========================================
// POST HANDLER: Handles POST requests for src/app/api/auth/vendor/login/route.js
// ==========================================
export async function POST(request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ message: "Missing credentials" }, { status: 400 });
        }

        // 1. Find user and vendor by email
        const [rows] = await db.execute(
            `SELECT u.user_id, u.email, u.password_hash, u.status, u.role, v.vendor_id, v.name, v.company_name, v.phone_number 
             FROM users u 
             LEFT JOIN vendors v ON u.user_id = v.user_id 
             WHERE u.email = ? AND u.role = 'vendor'`,
            [email]
        );

        if (rows.length === 0) {
            return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
        }

        const user = rows[0];

        // 2. Check Password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
        }

        const normalizedStatus = (user.status || 'pending').toLowerCase();

        // ENFORCE STATUS CHECKS
        if (normalizedStatus === 'pending') {
            return NextResponse.json({
                message: "Your application is currently pending approval. Please check back later.",
                user: { status: 'pending', email: user.email }
            }, { status: 403 });
        }

        if (normalizedStatus === 'rejected') {
            return NextResponse.json({
                message: "Your vendor application has been rejected. Please contact support.",
                user: { status: 'rejected', email: user.email }
            }, { status: 403 });
        }

        if (normalizedStatus === 'banned') {
            return NextResponse.json({
                message: "Your account has been suspended.",
                user: { status: 'banned', email: user.email }
            }, { status: 403 });
        }

        const isPendingDeletion = normalizedStatus === 'deletion_requested';

        // 4. Generate Token
        // id is user_id for system consistency, vendor_id is added for optimization
        const token = jwt.sign(
            { 
                id: user.user_id, 
                vendor_id: user.vendor_id, 
                role: 'vendor', 
                email: user.email 
            },
            process.env.JWT_SECRET || 'super_secret_stitch_key_2025',
            { expiresIn: '1d' }
        );

        return NextResponse.json({
            message: "Login successful",
            token,
            pending_deletion: isPendingDeletion,
            user: {
                email: user.email,
                status: user.status,
                name: user.name || "Vendor"
            }
        }, { status: 200 });

    } catch (error) {
        console.error("Vendor Login Error:", error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
