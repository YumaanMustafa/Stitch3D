
import db from '@/lib/db';
import { sendResetPasswordEmail } from '@/lib/email';
import { NextResponse } from "next/server";

/**
 * @file route.js
 * @description Forgotten Password API.
 * Generates a reset token (OTP) and sends it to the user's email.
 */

export async function POST(req) {
    try {
        const { email } = await req.json();
        if (!email) return NextResponse.json({ message: "Email required" }, { status: 400 });

        const normalized = email.toLowerCase();
        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [normalized]);
        const user = rows.length ? rows[0] : null;

        if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000);

        await db.query(
            `UPDATE users SET reset_code = ?, reset_expires = ? WHERE email = ?`,
            [otp, expires, normalized]
        );

        await sendResetPasswordEmail(normalized, otp);

        return NextResponse.json({ message: "OTP sent to your email" });

    } catch (err) {
        console.error("ForgotPassword error:", err?.stack ?? err);
        return NextResponse.json({ message: "Server error requesting reset" }, { status: 500 });
    }
}
