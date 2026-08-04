// Import Next.js tool for sending responses back to the browser
import { NextResponse } from 'next/server';
// Import the database connection tool
import db from '@/lib/db';
// Import bcryptjs for securely checking passwords against hashes
import bcrypt from 'bcryptjs';
// Import jsonwebtoken to create the login session ticket (token)
import jwt from 'jsonwebtoken';

/**
 * File: route.js
 * Location: src/app/api/admin/login/route.js
 * Description: Admin Login API Endpoint.
 * This is a highly restricted login gate specifically for Administrators. 
 * It checks a separate 'admins' table instead of the regular 'users' table.
 */

// ==========================================
// POST HANDLER: Handles POST requests when admins try to log in
// ==========================================
export async function POST(request) {
    try {
        // Step 1: Read the email and password from the form
        const body = await request.json();
        const { email, password } = body;

        // Ensure both fields were filled out
        if (!email || !password) {
            return NextResponse.json({ message: "Missing credentials" }, { status: 400 });
        }

        // Step 2: Search the 'admins' table for this email
        // Note that we do NOT look in the normal 'users' table for admins
        const [admins] = await db.execute("SELECT * FROM admins WHERE email = ?", [email]);

        // If no matching admin account is found, deny access
        if (admins.length === 0) {
            return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
        }

        const admin = admins[0];

        // Step 3: Check if the typed password matches the scrambled password in the database
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
        }

        // Step 4: Generate the Login Token (JWT)
        // Get the secret key used to lock the token.
        // It's best practice to use a strong, secret environment variable here.
        const token = jwt.sign(
            { id: admin.admin_id, role: 'admin', email: admin.email },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1d' } // Token is valid for 1 full day
        );

        // Step 5: Send the token and basic admin info back to the browser
        return NextResponse.json({
            message: "Login successful",
            token,
            admin: {
                id: admin.admin_id,
                email: admin.email,
                name: admin.name
            }
        }, { status: 200 });

    } catch (error) {
        // Log severe server crashes securely
        console.error("Admin Login Error:", error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
