// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import authentication tools
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/vendor/material-requests/[id]/renegotiate/route.js
 * Description: Vendor API to send a counter-offer to a Supplier.
 * If a quote is too high, the vendor can use this route to suggest a specific 
 * new price and attach a message explaining why.
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
// PUT HANDLER: Send a Counter-Offer for a Quoted Price
// ==========================================
export async function PUT(request, { params }) {
    try {
        // Step 1: Security Check
        const vendorId = await getVendorId(request);
        if (!vendorId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Grab the ID of the request
        const { id: requestId } = await params;
        
        // Read the new price and the chat message they submitted
        const body = await request.json().catch(() => ({}));
        const { price, message: chatMessage } = body;

        // Step 2: Validate the new price
        // Ensure it is a real number greater than 0
        if (!price || isNaN(price) || Number(price) <= 0) {
            return NextResponse.json({ error: "Valid renegotiation price is required" }, { status: 400 });
        }

        // Step 3: Check if the request is actually in the "quoted" state
        const [requestData] = await db.query(
            "SELECT id, status, supplier_id, material_name FROM material_requests WHERE id = ? AND vendor_id = ?",
            [requestId, vendorId]
        );

        if (requestData.length === 0) {
            return NextResponse.json({ error: "Request not found or unauthorized" }, { status: 404 });
        }

        if (requestData[0].status !== 'quoted') {
            return NextResponse.json({ error: "Only quoted requests can be renegotiated" }, { status: 400 });
        }

        // Step 4: Update the status to 'renegotiating'
        // We also save the specific `price` they asked for in the `renegotiated_price` column!
        await db.query(
            "UPDATE material_requests SET status = 'renegotiating', renegotiated_price = ? WHERE id = ?",
            [Number(price), requestId]
        );

        // Step 5: Automatically send the counter-offer message directly to the Supplier's inbox
        if (requestData[0].supplier_id) {
            try {
                // Find the user IDs for the chat system
                const [suppliers] = await db.query("SELECT user_id FROM suppliers WHERE supplier_id = ?", [requestData[0].supplier_id]);
                const [vendors] = await db.query("SELECT user_id FROM vendors WHERE vendor_id = ?", [vendorId]);
                
                if (suppliers.length > 0 && vendors.length > 0) {
                    // Assemble the automated chat message
                    const content = `[SYSTEM]: Renegotiation requested for Order #${requestId} at Rs ${Number(price).toLocaleString()}\n\n${chatMessage || 'No comment provided.'}`;
                    
                    // Insert it directly into the chat system ('messages' table)
                    await db.query(
                        "INSERT INTO messages (sender_id, receiver_id, content, created_at) VALUES (?, ?, ?, NOW())",
                        [vendors[0].user_id, suppliers[0].user_id, content]
                    );

                    // Step 6: Also add a real-time notification to the supplier's dashboard
                    await db.query(
                        "INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, 'supplier', ?, ?, 'request')",
                        [suppliers[0].user_id, "Renegotiation Requested", `Vendor has counter-offered Rs ${Number(price).toLocaleString()} for Order #${requestId}.`, "request"]
                    );
                }
            } catch (err) {
                // Log non-fatal chat errors quietly
                console.error("Non-fatal error injecting renegotiation message:", err);
            }
        }

        // Tell the browser the counter-offer was sent successfully
        return NextResponse.json({ message: "Renegotiation started successfully." }, { status: 200 });
        
    } catch (error) {
        // Log severe crashes safely
        console.error("Vendor Renegotiate Quotation API Error:", error);
        return NextResponse.json({ error: "Failed to start renegotiation" }, { status: 500 });
    }
}
