// Import Next.js tool for sending responses back to the browser
import { NextResponse } from 'next/server';
// Import the database connection tool
import db from '@/lib/db';
// Import bcryptjs for securely checking passwords against their hashes
import bcrypt from 'bcryptjs';
// Import jsonwebtoken to create the login session ticket (token)
import jwt from 'jsonwebtoken';

/**
 * File: route.js
 * Location: src/app/api/auth/vendor/login/route.js
 * Description: Vendor Login API Endpoint.
 * This is a special login gate just for Manufacturers (Vendors). It ensures 
 * that standard customers cannot log into the Vendor dashboard. It checks if the Admin 
 * has approved the vendor's account before granting access.
 */

// ==========================================
// POST HANDLER: Handles POST requests when vendors click "Login"
// ==========================================
export async function POST(request) {
    try {
        // Step 1: Read the email and password from the login form
        const body = await request.json();
        const { email, password } = body;

        // Ensure neither field is empty
        if (!email || !password) {
            return NextResponse.json({ message: "Missing credentials" }, { status: 400 });
        }

        // Step 2: Find the user in the database. 
        // We use a "JOIN" to fetch their basic user info AND their vendor-specific info all at once.
        // We specifically check that their role is 'vendor'
        const [rows] = await db.execute(
            `SELECT u.user_id, u.email, u.password_hash, u.status, u.role, v.vendor_id, v.name, v.company_name, v.phone_number 
             FROM users u 
             LEFT JOIN vendors v ON u.user_id = v.user_id 
             WHERE u.email = ? AND u.role = 'vendor'`,
            [email]
        );

        // If no matching vendor account is found, reject them
        if (rows.length === 0) {
            return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
        }

        const user = rows[0];

        // Step 3: Check if their typed password matches the scrambled password in the database
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
        }

        const normalizedStatus = (user.status || 'pending').toLowerCase();

        // Step 4: Check User Status (Are they approved by an admin yet?)
        // ENFORCE STATUS CHECKS
        
        // If they just signed up and the admin hasn't clicked "Approve" yet
        if (normalizedStatus === 'pending') {
            return NextResponse.json({
                message: "Your application is currently pending approval. Please check back later.",
                user: { status: 'pending', email: user.email }
            }, { status: 403 }); // 403 means Forbidden
        }

        // If the admin reviewed their application and rejected it
        if (normalizedStatus === 'rejected') {
            return NextResponse.json({
                message: "Your vendor application has been rejected. Please contact support.",
                user: { status: 'rejected', email: user.email }
            }, { status: 403 });
        }

        // If they broke the rules and the admin banned them
        if (normalizedStatus === 'banned') {
            return NextResponse.json({
                message: "Your account has been suspended.",
                user: { status: 'banned', email: user.email }
            }, { status: 403 });
        }

        // Check if they previously asked to delete their account
        const isPendingDeletion = normalizedStatus === 'deletion_requested';

        // Step 5: Generate the Login Token (JWT)
        // Get the secret key used to lock the token (with a fallback for development)
        const secret = process.env.JWT_SECRET || 'super_secret_stitch_key_2025';

        // Pack their user ID, vendor ID, role, and email into the token 
        // so the server knows who they are on future requests
        const token = jwt.sign(
            { 
                id: user.user_id, 
                vendor_id: user.vendor_id, 
                role: 'vendor', 
                email: user.email 
            },
            secret,
            { expiresIn: '1d' } // This token expires in 1 day
        );

        // Step 6: Send the token and user info back to the browser
        return NextResponse.json({
            message: "Login successful",
            token,
            pending_deletion: isPendingDeletion,
            user: {
                email: user.email,
                status: user.status,
                name: user.name || "Vendor"
            }
        }, { status: 200 });

    } catch (error) {
        // Log any server crashes securely
        console.error("Vendor Login Error:", error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
