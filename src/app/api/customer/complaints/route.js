// Import Next.js tool for sending responses
import { NextResponse } from "next/server";
// Import our custom tool to figure out who is submitting the complaint
import { getUserFromRequest } from '@/lib/auth';
// Import the database tool
import db from '@/lib/db';

/**
 * File: route.js
 * Location: src/app/api/customer/complaints/route.js
 * Description: Customer Complaints API.
 * This route allows customers to submit support tickets if they have 
 * an issue with an order or the website. It also lets them see their past tickets.
 */

// ==========================================
// POST HANDLER: Handles POST requests when a customer submits a new complaint
// ==========================================
export async function POST(req) {
    try {
        // Step 1: Security Check. Verify the user is logged in
        const userPayload = getUserFromRequest(req);
        if (!userPayload || !userPayload.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Step 2: Read the form data the customer filled out
        const body = await req.json();
        
        // type (e.g. 'refund'), subject, message, and the optional order ID they are complaining about
        const { type, subject, message, orderId } = body;

        // Ensure they actually wrote a subject and message
        if (!subject || !message) {
            return NextResponse.json({ message: "Subject and Message are required" }, { status: 400 });
        }

        // Step 3: Save the complaint into the 'complaints' table
        const [result] = await db.query(
            "INSERT INTO complaints (user_id, type, order_id, subject, message) VALUES (?, ?, ?, ?, ?)",
            [userPayload.id, type, orderId || null, subject, message]
        );

        // Step 4: Notify the Administrators
        // We look up all users who have the 'admin' role, and we put a notification 
        // into their dashboard so they know a new complaint needs review.
        try {
            const [admins] = await db.query("SELECT user_id FROM users WHERE role = 'admin'");
            for (const admin of admins) {
                await db.query(
                    "INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, 'admin', ?, ?, 'alert')",
                    [admin.user_id, "New Support Ticket", `Customer has filed a complaint: ${subject}`, "alert"]
                );
            }
        } catch (err) {
            // If the notification fails, we just log it. We don't want to crash 
            // the whole complaint submission process just because the alert failed.
            console.error("Non-fatal notification error:", err);
        }

        // Tell the customer their complaint was submitted successfully
        return NextResponse.json({ message: "Complaint submitted successfully" }, { status: 201 });

    } catch (err) {
        // Log severe crashes safely
        console.error("Complaints POST error:", err.message);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ==========================================
// GET HANDLER: Handles GET requests when a customer wants to see their past complaints
// ==========================================
export async function GET(req) {
    try {
        // Step 1: Security Check. Verify the user is logged in
        const userPayload = getUserFromRequest(req);
        if (!userPayload || !userPayload.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Step 2: Fetch all complaints submitted by this specific user, newest first
        const [complaints] = await db.query(
            "SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC",
            [userPayload.id]
        );

        // Send the list back to the browser to display in their dashboard
        return NextResponse.json(complaints);

    } catch (err) {
        // Log crashes safely
        console.error("Complaints GET error:", err.message);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
