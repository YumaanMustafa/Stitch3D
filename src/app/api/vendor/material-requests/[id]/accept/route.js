// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import authentication tools
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/vendor/material-requests/[id]/accept/route.js
 * Description: Vendor API to accept a Supplier's quote and finalize an order.
 * If a supplier sends a price quote back for raw materials, the vendor 
 * uses this route to say "Yes, I agree to pay that price. Let's do it."
 */

// ==========================================
// HELPER FUNCTION: Verify Token and get Vendor ID
// ==========================================
async function getVendorFromToken(request) {
    try {
        const payload = getVendorFromRequest(request);
        if (!payload) return null;
        const vendorId = await getVendorIdFromUser(payload);
        return vendorId ? { vendor_id: vendorId } : null;
    } catch (e) {
        return null;
    }
}

// ==========================================
// PUT HANDLER: Accept a Quote from a Supplier
// ==========================================
export async function PUT(request, { params }) {
    try {
        // Step 1: Security Check
        const vendor = await getVendorFromToken(request);
        if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Grab the request ID from the URL
        const { id } = await params;

        // Step 2: Verify the request is actually waiting for vendor approval ("quoted")
        // We include `vendor_id = ?` to ensure they can't blindly accept quotes belonging to someone else!
        const [requests] = await db.query(
            "SELECT id FROM material_requests WHERE id = ? AND vendor_id = ? AND status = 'quoted'",
            [id, vendor.vendor_id]
        );

        if (requests.length === 0) {
            return NextResponse.json({ error: "Request not found or not ready for acceptance" }, { status: 404 });
        }

        // Step 3: Update status to 'accepted' (meaning the Order is now officially Placed)
        await db.query("UPDATE material_requests SET status = 'accepted' WHERE id = ?", [id]);

        // Step 4: Notify the Supplier so they know to pack and ship the materials
        try {
            // Find out which supplier this was sent to
            const [mr] = await db.query("SELECT supplier_id, material_name FROM material_requests WHERE id = ?", [id]);
            if (mr.length > 0) {
                // Look up the supplier's user account ID
                const [suppliers] = await db.query("SELECT user_id FROM suppliers WHERE supplier_id = ?", [mr[0].supplier_id]);
                if (suppliers.length > 0) {
                    // Send the "Good News" alert
                    await db.query(
                        "INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, 'supplier', ?, ?, 'order')",
                        [suppliers[0].user_id, "Quote Accepted", `Vendor has accepted your quote for ${mr[0].material_name}. Prepare for fulfillment.`, "order"]
                    );
                }
            }
        } catch (err) {
            // Log notification failures safely
            console.error("Non-fatal notification error:", err);
        }

        // Tell the vendor their acceptance went through
        return NextResponse.json({ message: "Quotation accepted, order placed successfully" });

    } catch (error) {
        // Log severe crashes securely
        console.error("Vendor Accept Quotation PUT Error:", error);
        return NextResponse.json({ message: "Unable to process order" }, { status: 500 });
    }
}
