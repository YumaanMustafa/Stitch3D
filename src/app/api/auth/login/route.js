// Import bcryptjs for securely checking passwords (it compares hashes)
import bcrypt from "bcryptjs";
// Import jsonwebtoken to create the login session ticket (token)
import jwt from "jsonwebtoken";
// Import database connection to check user records
import db from '@/lib/db';
// Import Next.js response helper to send data back to the browser
import { NextResponse } from "next/server";

/**
 * File: route.js
 * Location: src/app/api/auth/login/route.js
 * Description: User Login API Endpoint.
 * This is the door to the application. When a user tries to log in, it checks 
 * if they exist, if their password is correct, and if their email is verified.
 * If everything is okay, it gives them a secure token (JWT) to access restricted pages.
 */

// ==========================================
// POST HANDLER: Handles POST requests when users click "Login"
// ==========================================
export async function POST(req) {
    try {
        // Step 1: Get the email and password the user typed in
        const { email, password } = await req.json();

        // Check if they left anything blank
        if (!email || !password) {
            return NextResponse.json({ message: "Email and password required" }, { status: 400 });
        }

        // Convert email to lowercase so 'John@test.com' matches 'john@test.com'
        const normalizedEmail = email.toLowerCase();

        // Step 2: Find the user in the database
        const [users] = await db.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
        const user = users.length ? users[0] : null;

        // If no user is found with that email, deny access
        if (!user) {
            return NextResponse.json({ message: "Invalid credentials" }, { status: 400 });
        }

        // Step 3: Check if the password is correct
        // We never store raw passwords, only scrambled hashes. bcrypt compares the typed password to the saved hash.
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return NextResponse.json({ message: "Invalid credentials" }, { status: 400 });
        }

        // Step 4: Security check - this specific login route is only for regular customers
        // Vendors and Admins have their own special login routes
        if (user.role !== 'customer') {
            return NextResponse.json({ message: "Invalid credentials" }, { status: 400 });
        }

        // Step 5: Check if the user has confirmed their email address
        if (user.status === "unverified") {
            return NextResponse.json({ message: "Please verify your email first" }, { status: 403 });
        }

        // Check if the user has asked to delete their account
        const isPendingDeletion = user.status === "deletion_requested";

        // Step 6: Create the Login Token (JWT)
        // Get the secret key used to lock the token
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error("FATAL: JWT_SECRET not set");
            return NextResponse.json({ message: "Server misconfiguration" }, { status: 500 });
        }

        // Pack the user's ID, email, and role inside the token. 
        // This token is like a VIP wristband that expires in 1 hour.
        const token = jwt.sign(
            { id: user.user_id, email: user.email, role: user.role },
            secret,
            { expiresIn: "1h" }
        );

        // Step 7: Send the token back to the browser so it can be saved in local storage
        return NextResponse.json({ 
            message: "Login successful", 
            token, 
            role: user.role,
            pending_deletion: isPendingDeletion 
        });

    } catch (err) {
        // If anything crashes during this process, safely log the error and send a 500 Server Error
        console.error("Login error:", err?.stack ?? err);
        return NextResponse.json({ message: "Server error during login" }, { status: 500 });
    }
}
