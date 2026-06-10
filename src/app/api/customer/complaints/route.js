import { NextResponse } from "next/server";
import { getUserFromRequest } from '@/lib/auth';
import db from '@/lib/db';

/**
 * @file route.js
 * @description Customer Complaints API.
 * Handles submission of customer support tickets/complaints.
 */

export async function POST(req) {
    try {
        const userPayload = getUserFromRequest(req);
        if (!userPayload || !userPayload.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { type, subject, message, orderId } = body;

        if (!subject || !message) {
            return NextResponse.json({ message: "Subject and Message are required" }, { status: 400 });
        }

        // Insert complaint into database
        const [result] = await db.query(
            "INSERT INTO complaints (user_id, type, order_id, subject, message) VALUES (?, ?, ?, ?, ?)",
            [userPayload.id, type, orderId || null, subject, message]
        );

        // Notify Admins
        try {
            const [admins] = await db.query("SELECT user_id FROM users WHERE role = 'admin'");
            for (const admin of admins) {
                await db.query(
                    "INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, 'admin', ?, ?, 'alert')",
                    [admin.user_id, "New Support Ticket", `Customer has filed a complaint: ${subject}`, "alert"]
                );
            }
        } catch (err) {
            console.error("Non-fatal notification error:", err);
        }

        return NextResponse.json({ message: "Complaint submitted successfully" }, { status: 201 });

    } catch (err) {
        console.error("Complaints POST error:", err.message);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        const userPayload = getUserFromRequest(req);
        if (!userPayload || !userPayload.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const [complaints] = await db.query(
            "SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC",
            [userPayload.id]
        );

        return NextResponse.json(complaints);

    } catch (err) {
        console.error("Complaints GET error:", err.message);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
