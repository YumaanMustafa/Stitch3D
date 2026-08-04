// Import bcryptjs for scrambling (hashing) passwords before saving them
import bcrypt from "bcryptjs";
// Import database connection tool
import db from '@/lib/db';
// Import our custom email tool to send the welcome code
import { sendVerificationEmail } from '@/lib/email';
// Import Next.js response helper
import { NextResponse } from "next/server";

/**
 * File: route.js
 * Location: src/app/api/auth/signup/route.js
 * Description: User Signup API Endpoint.
 * This route creates new accounts for Customers, Suppliers, and Vendors.
 * It saves their details securely, creates the appropriate database records,
 * and sends them an email with a 6-digit confirmation code.
 */

// ==========================================
// POST HANDLER: Handles POST requests when users submit the registration form
// ==========================================
export async function POST(req) {
    try {
        // Step 1: Read the data sent from the registration form
        const body = await req.json();
        const { firstName, lastName, email, password } = body;

        // Make sure the user didn't leave any required fields blank
        if (!firstName || !lastName || !email || !password) {
            return NextResponse.json({ message: "All fields are required" }, { status: 400 });
        }

        // Convert email to lowercase to prevent duplicates like 'A@test.com' and 'a@test.com'
        const normalizedEmail = email.toLowerCase();

        // Step 2: Check if this email is already registered in the database
        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
        const existing = rows.length ? rows[0] : null;
        
        // If the email is found, stop and tell the user
        if (existing) {
            return NextResponse.json({ message: "Email already exists" }, { status: 400 });
        }

        // Step 3: Scramble (hash) the password so hackers can't read it even if the database is stolen
        // The '10' is the salt round - the higher the number, the more secure but slower it is to generate
        const hashed = await bcrypt.hash(password, 10);
        
        // Step 4: Generate a random 6-digit verification code (OTP)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // The code will expire 10 minutes from exactly right now
        const expires = new Date(Date.now() + 10 * 60 * 1000); 

        // Decide what role this user has. Default to 'customer' if it's strange or missing.
        let role = body.role?.toLowerCase();
        if (!["customer", "supplier", "vendor"].includes(role)) role = "customer";

        // Step 5: Save the new user into the main 'users' table
        // Notice we save 'hashed', not the raw password. The status is 'pending' until they verify their email.
        const [result] = await db.query(
            `INSERT INTO users 
       (first_name, last_name, email, password_hash, role, status, two_fa_code, two_fa_expires_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
            [firstName, lastName, normalizedEmail, hashed, role, otp, expires]
        );

        // Get the brand new unique ID given to this user by the database
        const userId = result.insertId;

        // Step 6: Create specific records depending on their role
        // For example, a customer gets a row in the customers table to hold shipping details later
        if (role === "customer") {
            await db.query(`INSERT INTO customers (user_id) VALUES (?)`, [userId]);
        } else if (role === "supplier") {
            // Suppliers need admin approval, so they are marked as approved = 1 here (demo/test setup)
            await db.query(`INSERT INTO suppliers (user_id, approved) VALUES (?, 1)`, [userId]);
        } else if (role === "vendor") {
            // Vendors get a row in the vendors table to hold their shop details
            await db.query(`INSERT INTO vendors (user_id) VALUES (?)`, [userId]);
        }

        // Step 7: Send the 6-digit code to the user's email address
        await sendVerificationEmail(normalizedEmail, otp);

        // Step 8: Reply back to the browser saying everything was successful
        return NextResponse.json({
            message: `Signup successful as ${role}. Check your email for a 6-digit verification code.`,
            email: normalizedEmail,
            role,
        }, { status: 201 });

    } catch (err) {
        // If anything crashes, log it and return a 500 error safely
        console.error("Signup error:", err?.stack ?? err);
        return NextResponse.json({ message: "Server error during signup" }, { status: 500 });
    }
}
