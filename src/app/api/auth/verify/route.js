// Import database connection tool
import db from '@/lib/db';
// Import Next.js response helper
import { NextResponse } from "next/server";
// Import email tool for notifying admins
import { sendEmail } from '@/lib/email';

/**
 * File: route.js
 * Location: src/app/api/auth/verify/route.js
 * Description: Email Verification API Endpoint.
 * This checks the 6-digit code a user types in after signing up.
 * - If it's a Customer, their account turns 'active' instantly.
 * - If it's a Vendor/Supplier, their email is verified but they go into 'pending'
 *   status until an Admin manually approves their business.
 */

// ==========================================
// POST HANDLER: Handles POST requests when users submit their 6-digit code
// ==========================================
export async function POST(req) {
    try {
        // Step 1: Get the email and code typed into the form
        const { email, code } = await req.json();

        // Ensure neither is blank
        if (!email || !code) {
            return NextResponse.json({ message: "Email and code are required" }, { status: 400 });
        }

        // Lowercase the email to ensure exact matching
        const normalizedEmail = email.toLowerCase();

        // Step 2: Find the user in the database
        const [users] = await db.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
        const user = users.length ? users[0] : null;

        // If no user exists with this email, stop
        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // If they are already active, they don't need to verify again
        if (user.status === "active") {
            return NextResponse.json({ message: "Account already verified" }, { status: 400 });
        }

        // Step 3: Check if the code has expired (codes usually last 10 minutes)
        if (!user.two_fa_expires_at || new Date(user.two_fa_expires_at) < new Date()) {
            return NextResponse.json({ message: "Code expired" }, { status: 400 });
        }

        // Step 4: Check if the code they typed matches the code saved in the database
        if (user.two_fa_code !== code) {
            return NextResponse.json({ message: "Invalid verification code" }, { status: 400 });
        }

        // Step 5: Decide what happens next based on who they are
        // Vendors and Suppliers become 'pending' (waiting for admin). Customers become 'active'.
        const newStatus = (user.role === 'vendor' || user.role === 'supplier') ? 'pending' : 'active';

        // Update the user's status in the database, and clear out the old code so it can't be used again
        await db.query(
            `UPDATE users SET status = ?, two_fa_code = NULL, two_fa_expires_at = NULL WHERE email = ?`,
            [newStatus, normalizedEmail]
        );

        // Customize the success message shown to the user
        const successMsg = (user.role === 'vendor' || user.role === 'supplier')
            ? "✅ Email verified. Your account is now pending Admin approval."
            : "✅ Email verified successfully. You can now log in.";

        // Step 6: If it's a business account (vendor/supplier), send an alert email to the Admin
        if ((user.role === 'vendor' || user.role === 'supplier') && newStatus === 'pending') {
            const adminEmail = process.env.ADMIN_EMAIL || "admin@stitch.local";
            
            // Send an automated email telling the admin someone new wants to join the platform
            await sendEmail({
                to: adminEmail,
                subject: `🔔 New ${user.role} Application: ` + user.first_name,
                html: `
                    <h3>New ${user.role} Application Received</h3>
                    <p><strong>Business/ID:</strong> ${user.first_name} (ID: ${user.user_id})</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p>The email has been verified. Please log in to the Admin Dashboard to approve or reject this ${user.role}.</p>
                 `
            });
        }

        // Step 7: Tell the browser verification was successful
        return NextResponse.json({ message: successMsg, status: newStatus });

    } catch (err) {
        // Log errors securely on the backend
        console.error("Verify error:", err?.stack ?? err);
        return NextResponse.json({ message: "Server error during verification" }, { status: 500 });
    }
}
