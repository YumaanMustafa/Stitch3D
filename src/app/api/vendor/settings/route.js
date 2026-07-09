import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

// Helper to verify token and get vendor object
async function getVendor(request) {
    try {
        const payload = getVendorFromRequest(request);
        if (!payload) return null;
        
        const vendorId = await getVendorIdFromUser(payload);
        if (!vendorId) return null;

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
// GET HANDLER: Handles GET requests for src/app/api/vendor/settings/route.js
// ==========================================
export async function GET(request) {
    try {
        const vendor = await getVendor(request);
        if (!vendor) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch additional user details if linked
        let userDetails = {};
        if (vendor.user_id) {
            const [users] = await db.query("SELECT profile_picture, two_fa_code FROM users WHERE user_id = ?", [vendor.user_id]);
            if (users.length > 0) userDetails = users[0];
        }

        return NextResponse.json({
            name: vendor.name,
            email: vendor.email,
            phone: vendor.phone_number || "",
            logo: userDetails.profile_picture || "/profile/vendor-logo.png",
            twoFA: !!userDetails.two_fa_code,
            companyName: vendor.company_name
        });

    } catch (error) {
        console.error("Settings GET Error:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

// ==========================================
// PUT HANDLER: Handles PUT requests for src/app/api/vendor/settings/route.js
// ==========================================
export async function PUT(request) {
    try {
        const vendor = await getVendor(request);
        if (!vendor) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, email, phone, password, newPassword, twoFA } = body;

        // 1. Update basic info in vendors table (normalized, email goes to users)
        await db.execute(
            "UPDATE vendors SET name = ?, phone_number = ? WHERE vendor_id = ?",
            [name || vendor.name, phone !== undefined ? phone : (vendor.phone_number || null), vendor.vendor_id]
        );

        // 2. Update linked user info (email is stored here)
        if (vendor.user_id) {
            await db.execute(
                "UPDATE users SET email = ? WHERE user_id = ?",
                [email || vendor.email, vendor.user_id]
            );
        }

        // 3. Password Change
        if (newPassword) {
            // Verify current password
            if (!password) {
                return NextResponse.json({ error: "Current password required" }, { status: 400 });
            }
            const match = await bcrypt.compare(password, vendor.password_hash);
            if (!match) {
                return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
            }

            const hash = await bcrypt.hash(newPassword, 10);

            // Sync with users table (password_hash is stored here)
            if (vendor.user_id) {
                await db.execute("UPDATE users SET password_hash = ? WHERE user_id = ?", [hash, vendor.user_id]);
            }
        }

        // 4. Handle 2FA (Mock - in real app, would generate secret)
        // For now, we just acknowledge the toggle request but don't implement full 2FA flow here
        // as that requires QR code generation etc.

        return NextResponse.json({ message: "Settings updated successfully" });

    } catch (error) {
        console.error("Settings PUT Error:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
