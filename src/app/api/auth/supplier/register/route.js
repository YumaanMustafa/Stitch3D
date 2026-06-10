import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { sendVerificationEmail } from '@/lib/email';

/**
 * @file route.js
 * @description Supplier Registration API.
 * Creates a new Supplier account with 'unverified_email' status.
 * Initializes the email verification flow.
 */

export async function POST(request) {
  try {
    const body = await request.json();
    const { companyName, businessRegistrationNumber, email, password, phone, address } = body;

    // 1. Check if email exists
    const [existing] = await db.execute("SELECT user_id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return NextResponse.json({ message: "Email already registered." }, { status: 400 });
    }

    // 2. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // 4. Create User entry (status: unverified_email)
    // companyName is stored in first_name as requested
    const [userResult] = await db.execute(
      "INSERT INTO users (first_name, last_name, email, password_hash, role, status, two_fa_code, two_fa_expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
      [companyName, "Supplier", email, hashedPassword, 'supplier', 'unverified_email', otp, expires]
    );
    const userId = userResult.insertId;

    // 5. Create Supplier entry
    await db.execute(
      "INSERT INTO suppliers (user_id, business_registration_number, phone, address, created_at) VALUES (?, ?, ?, ?, NOW())",
      [userId, businessRegistrationNumber, phone, address]
    );

    // 6. Send Email
    await sendVerificationEmail(email, otp);

    return NextResponse.json({
      message: "Application started! Please verify your email.",
      user: {
        email,
        status: 'unverified_email'
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Supplier Register Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
