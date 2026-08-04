// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import bcryptjs for checking and hashing passwords securely
import bcrypt from 'bcryptjs';
// Import authentication tools
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/vendor/settings/route.js
 * Description: Vendor Settings API.
 * This route allows a Vendor to view and edit their profile details 
 * (like company name and phone number) and change their password.
 */

// ==========================================
// HELPER FUNCTION: Verify Token and Get Vendor Object
// ==========================================
async function getVendor(request) {
    try {
        const payload = getVendorFromRequest(request);
        if (!payload) return null;
        
        const vendorId = await getVendorIdFromUser(payload);
        if (!vendorId) return null;

        // Fetch their core vendor info and their user email/password in one go
        const [vendors] = await db.query(
            "SELECT v.*, u.email, u.password_hash FROM vendors v JOIN users u ON v.user_id = u.user_id WHERE v.vendor_id = ?",
            [vendorId]
        );
        return vendors[0] || null;
    } catch (e) {
        return null;
    }
}

// ==========================================
// GET HANDLER: Fetch current settings to populate the form
// ==========================================
export async function GET(request) {
    try {
        // Step 1: Security Check
        const vendor = await getVendor(request);
        if (!vendor) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Step 2: Fetch extra details (like their profile picture) from the main `users` table
        let userDetails = {};
        if (vendor.user_id) {
            const [users] = await db.query("SELECT profile_picture, two_fa_code FROM users WHERE user_id = ?", [vendor.user_id]);
            if (users.length > 0) userDetails = users[0];
        }

        // Step 3: Format the data beautifully and send it to the browser
        return NextResponse.json({
            name: vendor.name,
            email: vendor.email,
            phone: vendor.phone_number || "",
            // Use a placeholder logo if they haven't uploaded one
            logo: userDetails.profile_picture || "/profile/vendor-logo.png",
            // If they have a 2FA code saved, 2FA is turned on
            twoFA: !!userDetails.two_fa_code,
            companyName: vendor.company_name
        });

    } catch (error) {
        console.error("Settings GET Error:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

// ==========================================
// PUT HANDLER: Save changes made to the settings
// ==========================================
export async function PUT(request) {
    try {
        // Step 1: Security Check
        const vendor = await getVendor(request);
        if (!vendor) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Step 2: Read the new data they typed into the form
        const body = await request.json();
        const { name, email, phone, password, newPassword, twoFA } = body;

        // Step 3: Update the `vendors` table (company details)
        // If they left a field blank, we keep their old data (`vendor.name`)
        await db.execute(
            "UPDATE vendors SET name = ?, phone_number = ? WHERE vendor_id = ?",
            [name || vendor.name, phone !== undefined ? phone : (vendor.phone_number || null), vendor.vendor_id]
        );

        // Step 4: Update the `users` table (login details)
        if (vendor.user_id) {
            await db.execute(
                "UPDATE users SET email = ? WHERE user_id = ?",
                [email || vendor.email, vendor.user_id]
            );
        }

        // Step 5: Password Change Logic
        if (newPassword) {
            // They MUST provide their current password to change to a new one
            if (!password) {
                return NextResponse.json({ error: "Current password required" }, { status: 400 });
            }
            
            // Compare what they typed with what is actually stored in the database
            const match = await bcrypt.compare(password, vendor.password_hash);
            if (!match) {
                return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
            }

            // Scramble the new password so it is safe to store
            const hash = await bcrypt.hash(newPassword, 10);

            // Save the scrambled password to the database
            if (vendor.user_id) {
                await db.execute("UPDATE users SET password_hash = ? WHERE user_id = ?", [hash, vendor.user_id]);
            }
        }

        // Step 6: 2FA Toggle (Two-Factor Authentication)
        // For now, this is a placeholder. In a fully completed app, turning this on 
        // would generate a QR code for Google Authenticator.

        // Tell the browser everything saved successfully!
        return NextResponse.json({ message: "Settings updated successfully" });

    } catch (error) {
        console.error("Settings PUT Error:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
