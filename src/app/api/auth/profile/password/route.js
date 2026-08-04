// Import Next.js response tool for sending data back to the browser
import { NextResponse } from "next/server";
// Import our custom auth tool to see who is making the request
import { getUserFromRequest } from '@/lib/auth';
// Import the database tool to save the new password
import db from '@/lib/db';
// Import bcryptjs to securely check the old password and scramble the new one
import bcrypt from "bcryptjs";

/**
 * File: route.js
 * Location: src/app/api/auth/profile/password/route.js
 * Description: Change Password API Endpoint.
 * Allows a user who is already logged in to change their password,
 * provided they know their current (old) password.
 */

// ==========================================
// PUT HANDLER: Handles PUT requests when users try to update their password
// ==========================================
export async function PUT(req) {
    try {
        // Step 1: Ensure the user is actually logged in using their token
        const userPayload = getUserFromRequest(req);
        
        // Step 2: Read the passwords they typed into the form
        const { oldPassword, newPassword, confirmPassword } = await req.json();
        const { id } = userPayload;

        // Step 3: Run security checks on what they typed
        // Check for missing fields
        if (!oldPassword || !newPassword)
            return NextResponse.json({ message: "Old and new password required" }, { status: 400 });
        
        // Ensure the new password isn't too short
        if (newPassword.length < 6)
            return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
        
        // Ensure they typed the new password correctly twice
        if (confirmPassword && newPassword !== confirmPassword)
            return NextResponse.json({ message: "Passwords do not match" }, { status: 400 });

        // Step 4: Fetch the user's current hashed password from the database
        const [rows] = await db.query("SELECT password_hash FROM users WHERE user_id = ?", [id]);
        const user = rows[0];
        
        if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

        // Step 5: Check if the old password they typed matches their actual password
        const match = await bcrypt.compare(oldPassword, user.password_hash);
        if (!match) return NextResponse.json({ message: "Incorrect old password" }, { status: 400 });

        // Step 6: If everything is good, scramble (hash) the new password securely
        const hashed = await bcrypt.hash(newPassword, 10);
        
        // Step 7: Save the new scrambled password into the database
        await db.query("UPDATE users SET password_hash = ? WHERE user_id = ?", [hashed, id]);

        // Tell the user it was successful
        return NextResponse.json({ message: "Password changed successfully" });

    } catch (err) {
        // Catch server crashes
        console.error("ChangePassword error:", err.message);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
