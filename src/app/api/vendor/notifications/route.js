// Import Next.js tool for sending responses
import { NextResponse } from "next/server";
// Import authentication tools
import { getVendorFromRequest } from '@/lib/auth';
// Import the database connection tool
import db from '@/lib/db';

/**
 * File: route.js
 * Location: src/app/api/vendor/notifications/route.js
 * Description: Vendor Notifications API.
 * This route fetches all the recent alerts (like "New Order!" or "Quote Received!") 
 * specifically belonging to the logged-in Vendor.
 */

// ==========================================
// GET HANDLER: Load notifications for the vendor's dashboard
// ==========================================
export async function GET(req) {
    try {
        // Step 1: Security Check
        // Figure out who is asking for notifications
        const vendorPayload = getVendorFromRequest(req);
        
        // If they aren't logged in, block them
        if (!vendorPayload || !vendorPayload.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Step 2: Fetch the 20 most recent notifications from the database
        // We filter by `user_id` and ensure `role = 'vendor'` so we don't accidentally 
        // show them notifications meant for when they are logged in as a regular customer.
        const [rows] = await db.query(
            "SELECT * FROM notifications WHERE user_id = ? AND role = 'vendor' ORDER BY created_at DESC LIMIT 20",
            [vendorPayload.id]
        );

        // Step 3: Format the data perfectly for the frontend UI
        // The database uses `created_at` and `is_read`, but our frontend component 
        // prefers `time` and `read`. We map them here to prevent bugs.
        const notifications = rows.map(r => ({
            id: r.id,
            title: r.title,
            message: r.message,
            type: r.type,             // e.g., 'alert', 'order', 'request'
            time: r.created_at,       // The exact time it was sent
            read: Boolean(r.is_read)  // Convert 0/1 to false/true
        }));

        // Send the formatted list back to the browser
        return NextResponse.json(notifications);

    } catch (err) {
        // Log severe crashes securely
        console.error("Vendor Notifications GET error:", err.message);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
