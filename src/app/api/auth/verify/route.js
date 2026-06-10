
import db from '@/lib/db';
import { NextResponse } from "next/server";
import { sendEmail } from '@/lib/email';

/**
 * @file route.js
 * @description Email Verification API.
 * Verifies the user's OTP code.
 * - If User: Activates account immediately.
 * - If Vendor: Sets status to 'pending' and notifies Admin.
 */

export async function POST(req) {
    try {
        const { email, code } = await req.json();

        if (!email || !code) {
            return NextResponse.json({ message: "Email and code are required" }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase();

        // Find User
        const [users] = await db.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
        const user = users.length ? users[0] : null;

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        if (user.status === "active") {
            return NextResponse.json({ message: "Account already verified" }, { status: 400 });
        }

        if (!user.two_fa_expires_at || new Date(user.two_fa_expires_at) < new Date()) {
            return NextResponse.json({ message: "Code expired" }, { status: 400 });
        }

        if (user.two_fa_code !== code) {
            return NextResponse.json({ message: "Invalid verification code" }, { status: 400 });
        }

        // Determine new status based on role
        const newStatus = (user.role === 'vendor' || user.role === 'supplier') ? 'pending' : 'active';

        // Activate Account (or move to pending for vendors/suppliers)
        await db.query(
            `UPDATE users SET status = ?, two_fa_code = NULL, two_fa_expires_at = NULL WHERE email = ?`,
            [newStatus, normalizedEmail]
        );

        const successMsg = (user.role === 'vendor' || user.role === 'supplier')
            ? "✅ Email verified. Your account is now pending Admin approval."
            : "✅ Email verified successfully. You can now log in.";

        // If Vendor or Supplier, notify Admin
        if ((user.role === 'vendor' || user.role === 'supplier') && newStatus === 'pending') {
            const adminEmail = process.env.ADMIN_EMAIL || "admin@stitch.local";
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

        return NextResponse.json({ message: successMsg, status: newStatus });

    } catch (err) {
        console.error("Verify error:", err?.stack ?? err);
        return NextResponse.json({ message: "Server error during verification" }, { status: 500 });
    }
}
