
import db from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email';
import { NextResponse } from "next/server";

/**
 * @file route.js
 * @description Resend Verification Code API.
 * Generates a new OTP and sends it to the unverified user's email.
 */

export async function POST(req) {
    try {
        const { email } = await req.json();
        if (!email) return NextResponse.json({ message: "Email is required" }, { status: 400 });

        const normalizedEmail = email.toLowerCase();
        const [users] = await db.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
        const user = users.length ? users[0] : null;

        if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });
        if (user.status === "active") return NextResponse.json({ message: "Account already verified" }, { status: 400 });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000);

        await db.query(
            `UPDATE users SET two_fa_code = ?, two_fa_expires_at = ? WHERE email = ?`,
            [otp, expires, normalizedEmail]
        );

        await sendVerificationEmail(normalizedEmail, otp);

        return NextResponse.json({ message: "📩 New verification code sent successfully." });

    } catch (err) {
        console.error("Resend error:", err?.stack ?? err);
        return NextResponse.json({ message: "Server error during resend" }, { status: 500 });
    }
}
