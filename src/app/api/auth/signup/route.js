
import bcrypt from "bcryptjs";
import db from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email';
import { NextResponse } from "next/server";

/**
 * @file route.js
 * @description General User Signup API.
 * Handles registration for Customers, Suppliers, and Vendors.
 * Creates related role-specific records and sends verification emails.
 */

export async function POST(req) {
    try {
        const body = await req.json();
        const { firstName, lastName, email, password } = body;

        // Validation
        if (!firstName || !lastName || !email || !password) {
            return NextResponse.json({ message: "All fields are required" }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase();

        // Check existing
        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
        const existing = rows.length ? rows[0] : null;
        if (existing) {
            return NextResponse.json({ message: "Email already exists" }, { status: 400 });
        }

        const hashed = await bcrypt.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Role logic
        let role = body.role?.toLowerCase();
        if (!["customer", "supplier", "vendor"].includes(role)) role = "customer";

        // Insert user
        const [result] = await db.query(
            `INSERT INTO users 
       (first_name, last_name, email, password_hash, role, status, two_fa_code, two_fa_expires_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
            [firstName, lastName, normalizedEmail, hashed, role, otp, expires]
        );

        const userId = result.insertId;

        // Create role-specific row
        if (role === "customer") {
            await db.query(`INSERT INTO customers (user_id) VALUES (?)`, [userId]);
        } else if (role === "supplier") {
            await db.query(`INSERT INTO suppliers (user_id, approved) VALUES (?, 1)`, [userId]);
        } else if (role === "vendor") {
            await db.query(`INSERT INTO vendors (user_id) VALUES (?)`, [userId]);
        }

        // Send verification email
        await sendVerificationEmail(normalizedEmail, otp);

        return NextResponse.json({
            message: `Signup successful as ${role}. Check your email for a 6-digit verification code.`,
            email: normalizedEmail,
            role,
        }, { status: 201 });

    } catch (err) {
        console.error("Signup error:", err?.stack ?? err);
        return NextResponse.json({ message: "Server error during signup" }, { status: 500 });
    }
}
