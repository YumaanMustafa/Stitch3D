// Import database connection tool
import db from '@/lib/db';
// Import email tool specifically for sending password reset emails
import { sendResetPasswordEmail } from '@/lib/email';
// Import Next.js response helper
import { NextResponse } from "next/server";

/**
 * File: route.js
 * Location: src/app/api/auth/forgot-password/route.js
 * Description: Forgotten Password API Endpoint.
 * When a user forgets their password, they enter their email. This route 
 * generates a special 6-digit code (OTP) and emails it to them.
 */

// ==========================================
// POST HANDLER: Handles POST requests when users click "Forgot Password"
// ==========================================
export async function POST(req) {
    try {
        // Step 1: Get the email from the request
        const { email } = await req.json();
        
        // Stop if the email field is empty
        if (!email) return NextResponse.json({ message: "Email required" }, { status: 400 });

        // Standardize the email to lowercase
        const normalized = email.toLowerCase();
        
        // Step 2: Check if this user exists in our database
        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [normalized]);
        const user = rows.length ? rows[0] : null;

        // If the email is not in the system, return an error
        if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

        // Step 3: Create a secure 6-digit random code
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // The code will expire in 10 minutes
        const expires = new Date(Date.now() + 10 * 60 * 1000);

        // Step 4: Save the reset code to the database so we can check it later
        await db.query(
            `UPDATE users SET reset_code = ?, reset_expires = ? WHERE email = ?`,
            [otp, expires, normalized]
        );

        // Step 5: Send the actual email containing the code
        await sendResetPasswordEmail(normalized, otp);

        // Tell the user to check their email
        return NextResponse.json({ message: "OTP sent to your email" });

    } catch (err) {
        // Catch any server problems and log them safely
        console.error("ForgotPassword error:", err?.stack ?? err);
        return NextResponse.json({ message: "Server error requesting reset" }, { status: 500 });
    }
}
