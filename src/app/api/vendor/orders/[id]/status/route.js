// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database connection tool
import db from '@/lib/db';
// Import authentication tools
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/vendor/orders/[id]/status/route.js
 * Description: Vendor Order Status API.
 * This route allows a Vendor to update the shipping status of a customer's order.
 * (For example, changing an order from "Processing" to "Shipped").
 */

// ==========================================
// HELPER FUNCTION: Verify Token and get Vendor ID
// ==========================================
async function getVendorId(request) {
    try {
        const payload = getVendorFromRequest(request);
        if (!payload) return null;
        return await getVendorIdFromUser(payload);
    } catch (e) {
        return null;
    }
}

// ==========================================
// PUT HANDLER: Update the status of a specific order
// ==========================================
export async function PUT(request, { params }) {
    try {
        // Step 1: Security Check
        const vendorId = await getVendorId(request);
        if (!vendorId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Step 2: Grab the Order ID from the URL
        const resolvedParams = await params;
        const { id } = resolvedParams;
        if (!id) throw new Error("Missing ID");
        
        // Remove the "ORD-" text so the database just gets the number
        const dbId = id.toString().replace("ORD-", "");

        // Step 3: Read the new status from the form
        const body = await request.json();
        const { status } = body; // e.g., "Shipped", "Delivered"

        // Step 4: Strict Ownership Check
        // Update the order, but ONLY if it actually belongs to this specific vendor
        const [result] = await db.execute(
            "UPDATE orders SET status = ? WHERE order_id = ? AND vendor_id = ?",
            [status, dbId, vendorId]
        );

        // If 0 rows were updated, they tried to update an order that wasn't theirs
        if (result.affectedRows === 0) {
            return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
        }

        // Step 5: Notify the Customer that their order status has changed!
        try {
            // Find the user ID of the customer who placed this order
            const [orderRows] = await db.query(
                "SELECT c.user_id FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE o.order_id = ?",
                [dbId]
            );
            if (orderRows.length > 0) {
                // Send the alert to their dashboard
                await db.query(
                    "INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, 'customer', ?, ?, 'status')",
                    [orderRows[0].user_id, "Order Status Updated", `Your order ORD-${dbId} is now ${status}.`, "status"]
                );
            }
        } catch (err) {
            // Log notification errors safely without crashing the update
            console.error("Non-fatal notification error:", err);
        }

        // Tell the vendor their update was successful
        return NextResponse.json({ message: "Status updated", status });
        
    } catch (error) {
        // Log severe crashes safely
        console.error("Status Update Error:", error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}
