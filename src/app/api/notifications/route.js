import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import db from "@/lib/db";

/**
 * @file route.js
 * @description Universal Notifications API.
 */

export async function GET(req) {
    try {
        const user = getUserFromRequest(req);
        if (!user || !user.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        let actualUserId = user.id;
        if (user.role === 'vendor') {
            const [vRows] = await db.query("SELECT user_id FROM vendors WHERE vendor_id = ?", [user.id]);
            if (vRows.length > 0 && vRows[0].user_id) actualUserId = vRows[0].user_id;
        } else if (user.role === 'supplier') {
            const [sRows] = await db.query("SELECT user_id FROM suppliers WHERE supplier_id = ?", [user.id]);
            if (sRows.length > 0 && sRows[0].user_id) actualUserId = sRows[0].user_id;
        }

        const [rows] = await db.query(
            "SELECT * FROM notifications WHERE user_id = ? AND role = ? ORDER BY created_at DESC LIMIT 50",
            [actualUserId, user.role]
        );

        return NextResponse.json(rows);
    } catch (err) {
        console.error("Notifications GET error:", err.message);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const user = getUserFromRequest(req);
        if (!user || !user.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id, markAllAsRead } = await req.json();

        let actualUserId = user.id;
        if (user.role === 'vendor') {
            const [vRows] = await db.query("SELECT user_id FROM vendors WHERE vendor_id = ?", [user.id]);
            if (vRows.length > 0 && vRows[0].user_id) actualUserId = vRows[0].user_id;
        } else if (user.role === 'supplier') {
            const [sRows] = await db.query("SELECT user_id FROM suppliers WHERE supplier_id = ?", [user.id]);
            if (sRows.length > 0 && sRows[0].user_id) actualUserId = sRows[0].user_id;
        }

        if (markAllAsRead) {
            await db.query(
                "UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND role = ?",
                [actualUserId, user.role]
            );
        } else if (id) {
            await db.query(
                "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ? AND role = ?",
                [id, actualUserId, user.role]
            );
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Notifications PUT error:", err.message);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
