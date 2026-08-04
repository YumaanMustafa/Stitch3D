// Import Next.js tool for sending responses back to the browser
import { NextResponse } from 'next/server';
// Import the database connection tool
import db from '@/lib/db';
// Import bcryptjs for securely checking passwords
import bcrypt from 'bcryptjs';
// Import jsonwebtoken to create the login session ticket (token)
import jwt from 'jsonwebtoken';

/**
 * File: route.js
 * Location: src/app/api/auth/supplier/login/route.js
 * Description: Supplier Login API Endpoint.
 * This is a special login gate just for Suppliers. It ensures that standard 
 * customers cannot log into the Supplier dashboard. It also checks if the Admin 
 * has approved the supplier's account yet before letting them in.
 */

// ==========================================
// POST HANDLER: Handles POST requests when suppliers click "Login"
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
        // We specifically check that their role is 'supplier'
        const [users] = await db.execute("SELECT * FROM users WHERE email = ? AND role = 'supplier'", [email]);

        // If no matching supplier account is found, reject them
        if (users.length === 0) {
            return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
        }

        const user = users[0];

        // Step 3: Check if their typed password matches the scrambled password in the database
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
        }

        // Step 4: Check User Status (Are they approved by an admin yet?)
        const status = (user.status || 'pending').toLowerCase();

        // ENFORCE STATUS CHECKS
        // If they just signed up and the admin hasn't clicked "Approve" yet
        if (status === 'pending') {
            return NextResponse.json({
                message: "Your application is currently pending approval. Please check back later.",
                user: { status: 'pending', email: user.email }
            }, { status: 403 }); // 403 means Forbidden
        }

        // If the admin reviewed their application and rejected it
        if (status === 'rejected') {
            return NextResponse.json({
                message: "Your supplier application has been rejected. Please contact support.",
                user: { status: 'rejected', email: user.email }
            }, { status: 403 });
        }

        // If they broke the rules and the admin banned them
        if (status === 'banned') {
            return NextResponse.json({
                message: "Your account has been suspended.",
                user: { status: 'banned', email: user.email }
            }, { status: 403 });
        }

        // If they haven't typed in the 6-digit code sent to their email yet
        if (status === 'unverified_email') {
            return NextResponse.json({
                message: "Please verify your email address to continue.",
                user: { status: 'unverified_email', email: user.email }
            }, { status: 403 });
        }

        // Step 5: Fetch their specific supplier ID from the suppliers table
        const [suppliers] = await db.execute("SELECT supplier_id FROM suppliers WHERE user_id = ?", [user.user_id]);
        const supplierId = suppliers[0]?.supplier_id;

        // Step 6: Generate the Login Token (JWT)
        // Get the secret key used to lock the token
        const secret = process.env.JWT_SECRET || 'your_jwt_secret_key';
        
        // Pack their supplier ID, role, and email into the token so the server knows who they are on future requests
        const token = jwt.sign(
            { id: supplierId, role: 'supplier', email: user.email },
            secret,
            { expiresIn: '1d' } // This token expires in 1 day
        );

        // Step 7: Send the token and user info back to the browser
        return NextResponse.json({
            message: "Login successful",
            token,
            user: {
                email: user.email,
                status,
                name: user.first_name || user.last_name || 'Supplier'
            }
        }, { status: 200 });

    } catch (error) {
        // Log any server crashes securely
        console.error("Supplier Login Error:", error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
