import { NextResponse } from 'next/server';
// Fix: Using 5 levels up to reach backend config from:
// src/app/api/vendor/orders/[id]/status/route.js
import db from '@/lib/db';

/**
 * @file route.js
 * @description Vendor Order Status API.
 * Updates the status of a specific order (e.g., Processing -> Shipped).
 * Handles schema evolution (auto-adds status column if missing).
 */

import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

async function getVendorId(request) {
    try {
        const payload = getVendorFromRequest(request);
        if (!payload) return null;
        return await getVendorIdFromUser(payload);
    } catch (e) {
        return null;
    }
}

// PUT: Update Order Status
export async function PUT(request, { params }) {
    try {
        const vendorId = await getVendorId(request);
        if (!vendorId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const { id } = resolvedParams;
        if (!id) throw new Error("Missing ID");
        const dbId = id.toString().replace("ORD-", "");

        const body = await request.json();
        const { status } = body;

        // Strict Ownership Check
        const [result] = await db.execute(
            "UPDATE orders SET status = ? WHERE order_id = ? AND vendor_id = ?",
            [status, dbId, vendorId]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
        }

        // Notify Customer
        try {
            const [orderRows] = await db.query(
                "SELECT c.user_id FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE o.order_id = ?",
                [dbId]
            );
            if (orderRows.length > 0) {
                await db.query(
                    "INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, 'customer', ?, ?, 'status')",
                    [orderRows[0].user_id, "Order Status Updated", `Your order ORD-${dbId} is now ${status}.`, "status"]
                );
            }
        } catch (err) {
            console.error("Non-fatal notification error:", err);
        }

        return NextResponse.json({ message: "Status updated", status });
    } catch (error) {
        console.error("Status Update Error:", error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}
