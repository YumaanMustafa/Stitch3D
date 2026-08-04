// Import Next.js tool for sending responses back to the browser
import { NextResponse } from 'next/server';
// Import the database connection tool
import db from '@/lib/db';
// Import bcryptjs to scramble the new password securely
import bcrypt from 'bcryptjs';
// Import our custom email tool to send the welcome verification code
import { sendVerificationEmail } from '@/lib/email';

/**
 * File: route.js
 * Location: src/app/api/auth/vendor/register/route.js
 * Description: Vendor Registration API Endpoint.
 * This handles the signup form for new Manufacturers (Vendors). It saves their 
 * shop details, creates a user account, marks them as 'unverified_email',
 * and sends them a 6-digit confirmation code.
 */

// ==========================================
// POST HANDLER: Handles POST requests when new vendors submit the registration form
// ==========================================
export async function POST(request) {
  try {
    // Step 1: Read all the information typed into the signup form
    const body = await request.json();
    const { businessName, email, password, phone, shopAddress, specialization } = body;

    // Step 2: Check if an account with this email already exists
    const [existing] = await db.execute("SELECT user_id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
        // If they exist, stop and return an error
        return NextResponse.json({ message: "Email already registered." }, { status: 400 });
    }

    // Step 3: Scramble (hash) the password so hackers can't read it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Step 4: Generate a random 6-digit verification code (OTP)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // The code will expire in 10 minutes
    const expires = new Date(Date.now() + 10 * 60 * 1000); 

    // Step 5: Save the new user into the main 'users' table
    // For vendors, we store their business name in the first_name slot for simplicity
    const [userResult] = await db.execute(
      "INSERT INTO users (first_name, last_name, email, password_hash, role, status, two_fa_code, two_fa_expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
      [businessName, "Vendor", email, hashedPassword, 'vendor', 'unverified_email', otp, expires]
    );
    // Get the unique ID the database just assigned to this new user
    const userId = userResult.insertId;

    // Step 6: Create the specialized 'vendor' record that holds their shop details
    await db.execute(
      "INSERT INTO vendors (user_id, name, company_name, phone_number, shop_address, specialization, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
      [userId, businessName, businessName, phone, shopAddress, specialization]
    );

    // Step 7: Email the 6-digit verification code to the vendor
    await sendVerificationEmail(email, otp);

    // Step 8: Reply back to the browser telling them to check their email
    return NextResponse.json({
      message: "Application started! Please verify your email.",
      user: {
        email,
        status: 'unverified_email'
      }
    }, { status: 200 });

  } catch (error) {
    // Log any unexpected crashes on the server side
    console.error("Vendor Register Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
