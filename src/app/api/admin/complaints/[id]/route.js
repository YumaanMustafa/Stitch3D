import { NextResponse } from "next/server";
import { getAdminFromRequest } from '@/lib/auth';
import db from '@/lib/db';

/**
 * @file route.js
 * @description Admin Complaints Single Update API.
 */

export async function PUT(req, { params }) {
    try {
        const adminPayload = getAdminFromRequest(req);
        if (!adminPayload) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;
        const { status } = await req.json();

        if (!status) {
            return NextResponse.json({ message: "Status is required" }, { status: 400 });
        }

        await db.query(
            "UPDATE complaints SET status = ? WHERE complaint_id = ?",
            [status, id]
        );

        // Notify Customer
        try {
            const [complaintRows] = await db.query("SELECT user_id, subject FROM complaints WHERE complaint_id = ?", [id]);
            if (complaintRows.length > 0) {
                await db.query(
                    "INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, 'customer', ?, ?, 'alert')",
                    [complaintRows[0].user_id, "Support Update", `Your complaint "${complaintRows[0].subject}" has been updated to: ${status}`, "alert"]
                );
            }
        } catch (err) {
            console.error("Non-fatal notification error:", err);
        }

        return NextResponse.json({ message: "Complaint updated successfully" });

    } catch (err) {
        console.error("Admin Complaint PUT error:", err.message);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
