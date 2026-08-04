// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import jsonwebtoken to read login tokens
import jwt from 'jsonwebtoken';

/**
 * File: route.js
 * Location: src/app/api/supplier/vendor-requests/[id]/accept/route.js
 * Description: Supplier API to accept a vendor request and generate a bill (quote).
 * This route is called when a supplier clicks "Accept Request". They provide a 
 * price, tax, and shipping fee, which creates a Quote for the vendor to review.
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
// PUT HANDLER: Handles PUT requests when a supplier accepts a request and sends a quote
// ==========================================
export async function PUT(request, { params }) {
    try {
        // Step 1: Security Check
        const supplier = await getSupplierFromToken(request);
        if (!supplier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Grab the request ID from the URL
        const { id } = await params;
        
        // Read the financial details the supplier typed in
        const body = await request.json();
        const { item_price, tax, shipping, total } = body;

        // Step 2: Check current status of the request
        const [current] = await db.query("SELECT status FROM material_requests WHERE id = ? AND supplier_id = ?", [id, supplier.supplier_id]);
        if (current.length === 0) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }
        
        // If they already quoted it, they can't change it while the vendor is deciding
        if (current[0].status === 'quoted') {
            return NextResponse.json({ error: "Supplier cannot update the quote while it is under vendor review" }, { status: 400 });
        }

        // Step 3: Update the request status to 'quoted'
        // We also clear out the 'renegotiated_price' just in case this is the second time around
        await db.query("UPDATE material_requests SET status = 'quoted', renegotiated_price = NULL WHERE id = ? AND supplier_id = ?", [id, supplier.supplier_id]);

        // Step 4: Clear any old bills attached to this request so we don't accidentally make duplicates
        await db.query("DELETE FROM bills WHERE request_id = ?", [id]);

        // Step 5: Create the brand new bill (quote) record
        await db.query(`
            INSERT INTO bills (request_id, item_price, tax, shipping, total)
            VALUES (?, ?, ?, ?, ?)
        `, [id, item_price, tax, shipping, total]);

        // Step 6: Notify the Vendor that their quote is ready!
        try {
            // Figure out who the vendor is and what material they asked for
            const [mr] = await db.query("SELECT vendor_id, material_name FROM material_requests WHERE id = ?", [id]);
            if (mr.length > 0) {
                // Look up the vendor's user account ID
                const [vendors] = await db.query("SELECT user_id FROM vendors WHERE vendor_id = ?", [mr[0].vendor_id]);
                if (vendors.length > 0) {
                    // Send the alert
                    await db.query(
                        "INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, 'vendor', ?, ?, 'order')",
                        [vendors[0].user_id, "Quote Received", `Supplier has sent a quote for ${mr[0].material_name}. Total: Rs ${total.toLocaleString()}`, "order"]
                    );
                }
            }
        } catch (err) {
            // Log notification failures safely
            console.error("Non-fatal notification error:", err);
        }

        // Tell the supplier their quote was sent
        return NextResponse.json({ message: "Quotation created and sent to vendor" });

    } catch (error) {
        console.error("Supplier Accept PUT Error:", error);
        return NextResponse.json({ message: "Unable to update the status of the request" }, { status: 500 });
    }
}
