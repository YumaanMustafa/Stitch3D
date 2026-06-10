
import db from '@/lib/db';
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

/**
 * @file route.js
 * @description Vendor OTP Verification API.
 * Verifies OTP code for vendors during login or critical actions.
 * Activates the vendor account if verification succeeds.
 */

export async function POST(req) {
    try {
        const { email, otp } = await req.json();

        if (!email || !otp) {
            return NextResponse.json({ success: false, message: "Email and code are required" }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase();

        // Check Users Table (Unified Auth)
        const [users] = await db.query("SELECT * FROM users WHERE email = ? AND role = 'vendor'", [normalizedEmail]);
        const user = users.length ? users[0] : null;

        if (!user) {
            // Fallback: Check Vendors Table (Legacy) - generally vendors didn't have OTP in legacy, but maybe new flow?
            // If legacy vendor, we might not have OTP logic.
            return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
        }

        if (user.two_fa_code !== otp) {
            return NextResponse.json({ success: false, message: "Invalid verification code" }, { status: 400 });
        }

        // Activate Account
        await db.query(
            `UPDATE users SET status = 'active', two_fa_code = NULL, two_fa_expires_at = NULL WHERE email = ?`,
            [normalizedEmail]
        );

        // Generate Token
        const token = jwt.sign(
            { id: user.user_id, role: "vendor", email: user.email },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: "1h" }
        );

        return NextResponse.json({ success: true, message: "Verified", token });

    } catch (err) {
        console.error("Vendor Verify error:", err?.stack ?? err);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
