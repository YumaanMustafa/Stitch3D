// Import bcryptjs for scrambling the new password securely
import bcrypt from "bcryptjs";
// Import database tool
import db from '@/lib/db';
// Import Next.js response tool
import { NextResponse } from "next/server";

/**
 * File: route.js
 * Location: src/app/api/auth/reset-password/route.js
 * Description: Reset Password API Endpoint.
 * When a user forgets their password, they request a code. This file handles 
 * the final step: they submit the code alongside their brand new password.
 * It verifies the code is correct and hasn't expired, then saves the new password.
 */

// ==========================================
// POST HANDLER: Handles POST requests for resetting the password
// ==========================================
export async function POST(req) {
    try {
        // Step 1: Grab the email, the secret 6-digit code, and the new password they typed
        const { email, code, newPassword } = await req.json();

        // Check if anything is missing
        if (!email || !code || !newPassword) {
            return NextResponse.json({ message: "Email, code and new password required" }, { status: 400 });
        }

        // Lowercase the email to make finding it in the database easier
        const normalized = email.toLowerCase();
        
        // Step 2: Look up the user in the database
        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [normalized]);
        const user = rows.length ? rows[0] : null;

        // Stop if the user doesn't exist
        if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

        // Step 3: Check if the password reset code has expired
        // Like verification codes, reset codes also have a time limit for security
        if (!user.reset_expires || new Date(user.reset_expires) < new Date()) {
            return NextResponse.json({ message: "OTP expired" }, { status: 400 });
        }

        // Step 4: Check if the code they typed matches the one we sent them
        if (user.reset_code !== code) {
            return NextResponse.json({ message: "Invalid OTP" }, { status: 400 });
        }

        // Step 5: Everything is correct, so let's save the new password
        // Always scramble (hash) the new password before saving it
        const hashed = await bcrypt.hash(newPassword, 10);
        
        // Update the database: set the new password, and delete the reset code so it can't be used twice
        await db.query(
            `UPDATE users SET password_hash = ?, reset_code = NULL, reset_expires = NULL WHERE email = ?`,
            [hashed, normalized]
        );

        // Tell the user it worked!
        return NextResponse.json({ message: "Password reset successfully" });

    } catch (err) {
        // Log errors on the server side
        console.error("ResetPasswordOTP error:", err?.stack ?? err);
        return NextResponse.json({ message: "Server error resetting password" }, { status: 500 });
    }
}
