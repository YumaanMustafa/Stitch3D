import { NextResponse } from 'next/server';
import db from '@/lib/db';
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

export async function PUT(request, { params }) {
    try {
        const vendorId = await getVendorId(request);
        if (!vendorId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: requestId } = await params;

        // Check if the request is in "quoted" state and belongs to this vendor
        const [requestData] = await db.query(
            "SELECT id, status, supplier_id, material_name FROM material_requests WHERE id = ? AND vendor_id = ?",
            [requestId, vendorId]
        );

        if (requestData.length === 0) {
            return NextResponse.json({ error: "Request not found or unauthorized" }, { status: 404 });
        }

        if (requestData[0].status !== 'quoted') {
            return NextResponse.json({ error: "Only quoted requests can be declined" }, { status: 400 });
        }

        // Extract the optional renegotiation message
        const body = await request.json().catch(() => ({}));
        const { message: chatMessage } = body;

        // Update the status to 'pending' to restart the renegotiation cycle
        await db.query(
            "UPDATE material_requests SET status = 'pending' WHERE id = ?",
            [requestId]
        );

        // If a message was sent, automatically inject it into the B2B messages table!
        if (chatMessage && requestData[0].supplier_id) {
            try {
                const [suppliers] = await db.query("SELECT user_id FROM suppliers WHERE supplier_id = ?", [requestData[0].supplier_id]);
                const [vendors] = await db.query("SELECT user_id FROM vendors WHERE vendor_id = ?", [vendorId]);
                
                if (suppliers.length > 0 && vendors.length > 0) {
                    const content = `[SYSTEM]: Renegotiation requested for Order #${requestId}\n\n${chatMessage}`;
                    await db.query(
                        "INSERT INTO messages (sender_id, receiver_id, content, created_at) VALUES (?, ?, ?, NOW())",
                        [vendors[0].user_id, suppliers[0].user_id, content]
                    );

                    // Also add a real-time notification
                    await db.query(
                        "INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, 'supplier', ?, ?, 'request')",
                        [suppliers[0].user_id, "Renegotiation Requested", `Vendor for Order #${requestId} has requested a requote: ${chatMessage?.substring(0, 50)}...`]
                    );
                }
            } catch (err) {
                console.error("Non-fatal error injecting renegotiation message:", err);
            }
        }

        return NextResponse.json({ message: "Renegotiation started successfully." }, { status: 200 });
    } catch (error) {
        console.error("Vendor Decline Quotation API Error:", error);
        return NextResponse.json({ error: "Failed to decline quotation" }, { status: 500 });
    }
}
