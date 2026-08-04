// Import the database tool
import db from '@/lib/db';
// Import Next.js tool for sending responses
import { NextResponse } from "next/server";
// Import jsonwebtoken to create login tokens
import jwt from "jsonwebtoken";

/**
 * File: route.js
 * Location: src/app/api/vendor/verify-otp/route.js
 * Description: Vendor OTP (One Time Password) Verification API.
 * This route is used when a vendor tries to log in and is asked for a 6-digit 
 * code sent to their email. If the code is right, it activates their account 
 * and logs them in.
 */

// ==========================================
// POST HANDLER: Verify the 6-digit code
// ==========================================
export async function POST(req) {
    try {
        // Step 1: Read the email and the 6-digit code they typed in
        const { email, otp } = await req.json();

        // Ensure they actually filled out both boxes
        if (!email || !otp) {
            return NextResponse.json({ success: false, message: "Email and code are required" }, { status: 400 });
        }

        // Standardize the email to lowercase so 'John@gmail.com' matches 'john@gmail.com'
        const normalizedEmail = email.toLowerCase();

        // Step 2: Look up the vendor in the `users` table
        // We include `role = 'vendor'` to make sure customers can't use this route
        const [users] = await db.query("SELECT * FROM users WHERE email = ? AND role = 'vendor'", [normalizedEmail]);
        const user = users.length ? users[0] : null;

        // If we didn't find them, stop here
        if (!user) {
            return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
        }

        // Step 3: Check if the code they typed matches the code we saved in the database
        if (user.two_fa_code !== otp) {
            return NextResponse.json({ success: false, message: "Invalid verification code" }, { status: 400 });
        }

        // Step 4: Success! Activate their account.
        // We set their status to 'active' and delete the 6-digit code from the database 
        // so it can't be used again.
        await db.query(
            `UPDATE users SET status = 'active', two_fa_code = NULL, two_fa_expires_at = NULL WHERE email = ?`,
            [normalizedEmail]
        );

        // Step 5: Create a new digital "ID Card" (JWT Token) for them
        // This token will allow them to access all the protected vendor dashboard routes.
        // It expires in 1 hour.
        const token = jwt.sign(
            { id: user.user_id, role: "vendor", email: user.email },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: "1h" }
        );

        // Send the token back to their browser so they can log in
        return NextResponse.json({ success: true, message: "Verified", token });

    } catch (err) {
        // Log severe crashes safely
        console.error("Vendor Verify error:", err?.stack ?? err);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
