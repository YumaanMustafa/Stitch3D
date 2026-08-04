// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import jsonwebtoken to read login tokens
import jwt from 'jsonwebtoken';

/**
 * File: route.js
 * Location: src/app/api/supplier/vendor-requests/[id]/accept-renegotiation/route.js
 * Description: Supplier API to accept a vendor's counter-offer (renegotiation).
 * If a vendor thinks a quote is too high, they suggest a new price. 
 * If the supplier agrees, this route approves the new price and updates the bill.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// ==========================================
// HELPER FUNCTION: Verify Token
// ==========================================
async function getSupplierFromToken(request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'supplier') return null;
        return { supplier_id: decoded.id };
    } catch (err) {
        return null;
    }
}

// ==========================================
// PUT HANDLER: Handles PUT requests when a supplier accepts a counter-offer
// ==========================================
export async function PUT(request, { params }) {
    try {
        // Step 1: Security Check
        const supplier = await getSupplierFromToken(request);
        if (!supplier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Grab the request ID from the URL
        const { id } = await params;

        // Step 2: Verify the request is actually in the 'renegotiating' state
        // We can't accept a counter-offer if they never made one!
        const [requests] = await db.query(
            "SELECT id, status, renegotiated_price, vendor_id, material_name FROM material_requests WHERE id = ? AND supplier_id = ?",
            [id, supplier.supplier_id]
        );

        if (requests.length === 0) {
            return NextResponse.json({ error: "Request not found or unauthorized" }, { status: 404 });
        }

        const reqData = requests[0];
        if (reqData.status !== 'renegotiating') {
            return NextResponse.json({ error: "Request is not in renegotiating state" }, { status: 400 });
        }

        const newPrice = reqData.renegotiated_price;
        if (!newPrice) {
            return NextResponse.json({ error: "No renegotiated price found" }, { status: 400 });
        }

        // Step 3: Update the Bill
        // Delete the old expensive bill...
        await db.query("DELETE FROM bills WHERE request_id = ?", [id]);
        
        // ...and insert the new agreed-upon cheaper bill. 
        // We assume tax and shipping are now baked into the renegotiated total price.
        await db.query(`
            INSERT INTO bills (request_id, item_price, tax, shipping, total)
            VALUES (?, ?, 0, 0, ?)
        `, [id, newPrice, newPrice]);

        // Step 4: Finalize the Request
        // Change the status to 'accepted' and clear out the renegotiated_price variable 
        // so it doesn't accidentally get used again.
        await db.query("UPDATE material_requests SET status = 'accepted', renegotiated_price = NULL WHERE id = ?", [id]);

        // Step 5: Notify the Vendor
        try {
            const [vendors] = await db.query("SELECT user_id FROM vendors WHERE vendor_id = ?", [reqData.vendor_id]);
            if (vendors.length > 0) {
                await db.query(
                    "INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, 'vendor', ?, ?, 'order')",
                    [vendors[0].user_id, "Renegotiation Accepted", `Supplier has accepted your counter-offer of Rs ${newPrice.toLocaleString()} for ${reqData.material_name}.`, "order"]
                );
            }
        } catch (err) {
            console.error("Non-fatal notification error:", err);
        }

        return NextResponse.json({ message: "Renegotiation accepted and quote updated successfully" });

    } catch (error) {
        console.error("Supplier Accept Renegotiation PUT Error:", error);
        return NextResponse.json({ message: "Unable to accept renegotiation" }, { status: 500 });
    }
}
