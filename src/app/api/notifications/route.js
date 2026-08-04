// Import Next.js tool for sending responses
import { NextResponse } from "next/server";
// Import our custom auth tool to figure out who is requesting their notifications
import { getUserFromRequest } from "@/lib/auth";
// Import the database tool
import db from "@/lib/db";

/**
 * File: route.js
 * Location: src/app/api/notifications/route.js
 * Description: Universal Notifications API.
 * This route fetches and manages system alerts (like "Your order shipped" 
 * or "New message"). It works for all user types (Customers, Vendors, Suppliers, Admins).
 */

// ==========================================
// GET HANDLER: Fetches the list of notifications for the logged-in user
// ==========================================
export async function GET(req) {
    try {
        // Step 1: Security Check. Find out who is making the request
        const user = getUserFromRequest(req);
        
        // Stop if they aren't logged in
        if (!user || !user.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Step 2: Handle special ID rules for Vendors and Suppliers
        // Sometimes the ID in the token is their special "business" ID (like vendor_id),
        // but the notifications table always uses the main "user_id". 
        // We have to convert it if necessary.
        let actualUserId = user.id;
        
        if (user.role === 'vendor') {
            // Find the main user_id linked to this vendor_id
            const [vRows] = await db.query("SELECT user_id FROM vendors WHERE vendor_id = ?", [user.id]);
            if (vRows.length > 0 && vRows[0].user_id) actualUserId = vRows[0].user_id;
        } else if (user.role === 'supplier') {
            // Find the main user_id linked to this supplier_id
            const [sRows] = await db.query("SELECT user_id FROM suppliers WHERE supplier_id = ?", [user.id]);
            if (sRows.length > 0 && sRows[0].user_id) actualUserId = sRows[0].user_id;
        }

        // Step 3: Fetch the last 50 notifications for this user, newest ones first
        const [rows] = await db.query(
            "SELECT * FROM notifications WHERE user_id = ? AND role = ? ORDER BY created_at DESC LIMIT 50",
            [actualUserId, user.role]
        );

        // Step 4: Send the list back to the browser to display in the bell menu
        return NextResponse.json(rows);
        
    } catch (err) {
        // Log crashes securely
        console.error("Notifications GET error:", err.message);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ==========================================
// PUT HANDLER: Marks notifications as "read" so they stop being highlighted
// ==========================================
export async function PUT(req) {
    try {
        // Step 1: Security Check
        const user = getUserFromRequest(req);
        if (!user || !user.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Step 2: Check if they want to clear ALL notifications or just one specific one
        const { id, markAllAsRead } = await req.json();

        // Step 3: Handle special ID rules for Vendors and Suppliers (same as above)
        let actualUserId = user.id;
        
        if (user.role === 'vendor') {
            const [vRows] = await db.query("SELECT user_id FROM vendors WHERE vendor_id = ?", [user.id]);
            if (vRows.length > 0 && vRows[0].user_id) actualUserId = vRows[0].user_id;
        } else if (user.role === 'supplier') {
            const [sRows] = await db.query("SELECT user_id FROM suppliers WHERE supplier_id = ?", [user.id]);
            if (sRows.length > 0 && sRows[0].user_id) actualUserId = sRows[0].user_id;
        }

        // Step 4: Update the database
        if (markAllAsRead) {
            // Update every single notification for this user to be "read" (TRUE)
            await db.query(
                "UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND role = ?",
                [actualUserId, user.role]
            );
        } else if (id) {
            // Only update the one specific notification they clicked on
            await db.query(
                "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ? AND role = ?",
                [id, actualUserId, user.role]
            );
        }

        // Tell the browser the update was successful
        return NextResponse.json({ success: true });
        
    } catch (err) {
        // Log crashes securely
        console.error("Notifications PUT error:", err.message);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
