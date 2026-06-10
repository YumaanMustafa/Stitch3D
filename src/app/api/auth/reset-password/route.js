
import bcrypt from "bcryptjs";
import db from '@/lib/db';
import { NextResponse } from "next/server";

/**
 * @file route.js
 * @description Reset Password API.
 * Verifies the OTP and updates the user's password.
 */

export async function POST(req) {
    try {
        const { email, code, newPassword } = await req.json();

        if (!email || !code || !newPassword) {
            return NextResponse.json({ message: "Email, code and new password required" }, { status: 400 });
        }

        const normalized = email.toLowerCase();
        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [normalized]);
        const user = rows.length ? rows[0] : null;

        if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

        if (!user.reset_expires || new Date(user.reset_expires) < new Date()) {
            return NextResponse.json({ message: "OTP expired" }, { status: 400 });
        }

        if (user.reset_code !== code) {
            return NextResponse.json({ message: "Invalid OTP" }, { status: 400 });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await db.query(
            `UPDATE users SET password_hash = ?, reset_code = NULL, reset_expires = NULL WHERE email = ?`,
            [hashed, normalized]
        );

        return NextResponse.json({ message: "Password reset successfully" });

    } catch (err) {
        console.error("ResetPasswordOTP error:", err?.stack ?? err);
        return NextResponse.json({ message: "Server error resetting password" }, { status: 500 });
    }
}
