
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from '@/lib/db';
import { NextResponse } from "next/server";

/**
 * @file route.js
 * @description User Login API.
 * Authenticates users (Customers/Vendors), checks email verification status, and issues JWT tokens.
 */

export async function POST(req) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ message: "Email and password required" }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase();

        // Find User
        const [users] = await db.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
        const user = users.length ? users[0] : null;

        if (!user) {
            return NextResponse.json({ message: "Invalid credentials" }, { status: 400 });
        }

        // Check Password
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return NextResponse.json({ message: "Invalid credentials" }, { status: 400 });
        }

        if (user.role !== 'customer') {
            return NextResponse.json({ message: "Invalid credentials" }, { status: 400 });
        }

        if (user.status === "unverified") {
            return NextResponse.json({ message: "Please verify your email first" }, { status: 403 });
        }

        const isPendingDeletion = user.status === "deletion_requested";

        // Generate Token
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error("FATAL: JWT_SECRET not set");
            return NextResponse.json({ message: "Server misconfiguration" }, { status: 500 });
        }

        const token = jwt.sign(
            { id: user.user_id, email: user.email, role: user.role },
            secret,
            { expiresIn: "1h" }
        );

        return NextResponse.json({ 
            message: "Login successful", 
            token, 
            role: user.role,
            pending_deletion: isPendingDeletion 
        });

    } catch (err) {
        console.error("Login error:", err?.stack ?? err);
        return NextResponse.json({ message: "Server error during login" }, { status: 500 });
    }
}
