// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import jsonwebtoken to read login tokens
import jwt from 'jsonwebtoken';

/**
 * File: route.js
 * Location: src/app/api/supplier/vendor-requests/[id]/reject/route.js
 * Description: Supplier API to reject a vendor request.
 * If the supplier is out of stock or doesn't want to fulfill a material request, 
 * this route marks it as 'rejected' and alerts the vendor.
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
// PUT HANDLER: Handles PUT requests when a supplier clicks "Reject"
// ==========================================
export async function PUT(request, { params }) {
    try {
        // Step 1: Security Check
        const supplier = await getSupplierFromToken(request);
        if (!supplier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Grab the request ID from the URL
        const { id } = await params;

        // Step 2: Update status to 'rejected'
        // We include supplier_id in the query to ensure they can only reject their OWN requests.
        await db.query("UPDATE material_requests SET status = 'rejected' WHERE id = ? AND supplier_id = ?", [id, supplier.supplier_id]);

        // Step 3: Notify the disappointed Vendor
        try {
            // Find out what material it was and who asked for it
            const [mr] = await db.query("SELECT vendor_id, material_name FROM material_requests WHERE id = ?", [id]);
            if (mr.length > 0) {
                // Find the vendor's main user account ID
                const [vendors] = await db.query("SELECT user_id FROM vendors WHERE vendor_id = ?", [mr[0].vendor_id]);
                if (vendors.length > 0) {
                    // Send the bad news alert
                    await db.query(
                        "INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, 'vendor', ?, ?, 'alert')",
                        [vendors[0].user_id, "Request Rejected", `Supplier cannot provide ${mr[0].material_name} at this time.`, "alert"]
                    );
                }
            }
        } catch (err) {
            // Log notification errors safely
            console.error("Non-fatal notification error:", err);
        }

        // Tell the supplier they successfully rejected it
        return NextResponse.json({ message: "Material not available" });

    } catch (error) {
        console.error("Supplier Reject PUT Error:", error);
        return NextResponse.json({ message: "Unable to update the status of the request" }, { status: 500 });
    }
}
