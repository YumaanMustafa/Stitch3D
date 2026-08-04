// Import the database tool to find users
import db from '@/lib/db';
// Import the email tool to send the actual email
import { sendVerificationEmail } from '@/lib/email';
// Import Next.js tool to send responses back to the browser
import { NextResponse } from "next/server";

/**
 * File: route.js
 * Location: src/app/api/auth/resend-code/route.js
 * Description: Resend Verification Code API Endpoint.
 * If a user didn't get their 6-digit signup code (or it expired), 
 * this route generates a brand new one and emails it to them again.
 */

// ==========================================
// POST HANDLER: Handles POST requests when users click "Resend Code"
// ==========================================
export async function POST(req) {
    try {
        // Step 1: Read the email from the request
        const { email } = await req.json();
        
        // Ensure they actually provided an email
        if (!email) return NextResponse.json({ message: "Email is required" }, { status: 400 });

        // Lowercase it to prevent mismatch errors
        const normalizedEmail = email.toLowerCase();
        
        // Step 2: Look up the user in the database
        const [users] = await db.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
        const user = users.length ? users[0] : null;

        // If the user doesn't exist, we can't send a code
        if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });
        
        // If they are already active, they don't need a code anymore
        if (user.status === "active") return NextResponse.json({ message: "Account already verified" }, { status: 400 });

        // Step 3: Generate a brand new 6-digit verification code
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Set the new expiration time to 10 minutes from exactly right now
        const expires = new Date(Date.now() + 10 * 60 * 1000);

        // Step 4: Save the new code and expiration time into the database, replacing the old one
        await db.query(
            `UPDATE users SET two_fa_code = ?, two_fa_expires_at = ? WHERE email = ?`,
            [otp, expires, normalizedEmail]
        );

        // Step 5: Email the new code to the user
        await sendVerificationEmail(normalizedEmail, otp);

        // Step 6: Tell the frontend that it worked successfully
        return NextResponse.json({ message: "📩 New verification code sent successfully." });

    } catch (err) {
        // Catch and log any server crashes
        console.error("Resend error:", err?.stack ?? err);
        return NextResponse.json({ message: "Server error during resend" }, { status: 500 });
    }
}
