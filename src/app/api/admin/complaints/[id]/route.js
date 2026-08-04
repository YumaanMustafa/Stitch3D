// Import Next.js tool for sending responses back to the browser
import { NextResponse } from "next/server";
// Import our custom auth tool to verify the user is an admin
import { getAdminFromRequest } from '@/lib/auth';
// Import the database connection tool
import db from '@/lib/db';

/**
 * File: route.js
 * Location: src/app/api/admin/complaints/[id]/route.js
 * Description: Admin Complaints Single Update API.
 * This route allows the Admin to change the status of a specific complaint 
 * (like marking it as "resolved" or "reviewed"). It also sends an automated 
 * notification back to the customer who submitted the complaint.
 */

// ==========================================
// PUT HANDLER: Handles PUT requests when the Admin updates a complaint's status
// ==========================================
export async function PUT(req, { params }) {
    try {
        // Step 1: Security Check. Make sure the person is an Admin.
        const adminPayload = getAdminFromRequest(req);
        if (!adminPayload) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Step 2: Grab the ID of the specific complaint from the URL (the [id] part)
        const { id } = params;
        
        // Read the new status sent by the Admin (e.g. "resolved")
        const { status } = await req.json();

        // Stop if the Admin forgot to provide a new status
        if (!status) {
            return NextResponse.json({ message: "Status is required" }, { status: 400 });
        }

        // Step 3: Update the complaint's status in the database
        await db.query(
            "UPDATE complaints SET status = ? WHERE complaint_id = ?",
            [status, id]
        );

        // Step 4: Try to notify the Customer about the update
        try {
            // First, find out who submitted this specific complaint
            const [complaintRows] = await db.query("SELECT user_id, subject FROM complaints WHERE complaint_id = ?", [id]);
            
            // If we found the complaint...
            if (complaintRows.length > 0) {
                // ...insert a new alert into the notifications table for that specific user
                await db.query(
                    "INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, 'customer', ?, ?, 'alert')",
                    [complaintRows[0].user_id, "Support Update", `Your complaint "${complaintRows[0].subject}" has been updated to: ${status}`, "alert"]
                );
            }
        } catch (err) {
            // If the notification fails, we just log it. We don't want to crash the whole 
            // request because the main job (updating the status) already succeeded.
            console.error("Non-fatal notification error:", err);
        }

        // Step 5: Tell the Admin dashboard that the update worked
        return NextResponse.json({ message: "Complaint updated successfully" });

    } catch (err) {
        // Log serious server crashes
        console.error("Admin Complaint PUT error:", err.message);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
