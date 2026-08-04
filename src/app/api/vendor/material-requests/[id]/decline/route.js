// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import authentication tools
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/vendor/material-requests/[id]/decline/route.js
 * Description: Vendor API to decline a Supplier's quote and request renegotiation.
 * If a vendor thinks a quote is too high, they can decline it and optionally 
 * send a message back to the supplier asking for a better deal.
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
// PUT HANDLER: Decline a Quote and start renegotiation
// ==========================================
export async function PUT(request, { params }) {
    try {
        // Step 1: Security Check
        const vendorId = await getVendorId(request);
        if (!vendorId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Grab the ID of the request we want to decline
        const { id: requestId } = await params;

        // Step 2: Check if the request is actually in the "quoted" state
        const [requestData] = await db.query(
            "SELECT id, status, supplier_id, material_name FROM material_requests WHERE id = ? AND vendor_id = ?",
            [requestId, vendorId]
        );

        if (requestData.length === 0) {
            return NextResponse.json({ error: "Request not found or unauthorized" }, { status: 404 });
        }

        // We can't decline a request that hasn't been quoted yet!
        if (requestData[0].status !== 'quoted') {
            return NextResponse.json({ error: "Only quoted requests can be declined" }, { status: 400 });
        }

        // Step 3: Extract the optional chat message the vendor typed in the decline popup
        const body = await request.json().catch(() => ({}));
        const { message: chatMessage } = body;

        // Step 4: Reset the status back to 'pending'
        // This puts the request back in the supplier's inbox so they can send a new quote.
        await db.query(
            "UPDATE material_requests SET status = 'pending' WHERE id = ?",
            [requestId]
        );

        // Step 5: Automatically send the vendor's complaint message directly to the Supplier's inbox!
        if (chatMessage && requestData[0].supplier_id) {
            try {
                // Find the user IDs for both the Vendor and the Supplier
                const [suppliers] = await db.query("SELECT user_id FROM suppliers WHERE supplier_id = ?", [requestData[0].supplier_id]);
                const [vendors] = await db.query("SELECT user_id FROM vendors WHERE vendor_id = ?", [vendorId]);
                
                if (suppliers.length > 0 && vendors.length > 0) {
                    // Assemble the automated system message
                    const content = `[SYSTEM]: Renegotiation requested for Order #${requestId}\n\n${chatMessage}`;
                    
                    // Insert it directly into the chat system ('messages' table)
                    await db.query(
                        "INSERT INTO messages (sender_id, receiver_id, content, created_at) VALUES (?, ?, ?, NOW())",
                        [vendors[0].user_id, suppliers[0].user_id, content]
                    );

                    // Step 6: Also send a standard alert notification to the supplier
                    await db.query(
                        "INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, 'supplier', ?, ?, 'request')",
                        [suppliers[0].user_id, "Renegotiation Requested", `Vendor for Order #${requestId} has requested a requote: ${chatMessage?.substring(0, 50)}...`]
                    );
                }
            } catch (err) {
                // Log non-fatal errors quietly
                console.error("Non-fatal error injecting renegotiation message:", err);
            }
        }

        // Tell the browser the decline was successful
        return NextResponse.json({ message: "Renegotiation started successfully." }, { status: 200 });
        
    } catch (error) {
        // Log severe crashes safely
        console.error("Vendor Decline Quotation API Error:", error);
        return NextResponse.json({ error: "Failed to decline quotation" }, { status: 500 });
    }
}
