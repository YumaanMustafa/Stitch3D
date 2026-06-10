import { NextResponse } from "next/server";
import { getVendorFromRequest } from '@/lib/auth';
import db from '@/lib/db';

/**
 * @file route.js
 * @description Vendor Notifications API.
 * Fetches notifications for the logged-in vendor.
 */

export async function GET(req) {
    try {
        const vendorPayload = getVendorFromRequest(req);
        if (!vendorPayload || !vendorPayload.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const [rows] = await db.query(
            "SELECT * FROM notifications WHERE user_id = ? AND role = 'vendor' ORDER BY created_at DESC LIMIT 20",
            [vendorPayload.id]
        );

        // Map database fields to frontend expectations if necessary
        const notifications = rows.map(r => ({
            id: r.id,
            title: r.title,
            message: r.message,
            type: r.type,
            time: r.created_at,
            read: Boolean(r.is_read)
        }));

        return NextResponse.json(notifications);

    } catch (err) {
        console.error("Vendor Notifications GET error:", err.message);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
