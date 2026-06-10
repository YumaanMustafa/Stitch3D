import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

/**
 * @file route.js
 * @description Supplier API to reject a vendor request.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

async function getSupplierFromToken(request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'supplier') return null;
        // The token already contains the supplier_id as 'id'
        return { supplier_id: decoded.id };
    } catch (err) {
        return null;
    }
}

export async function PUT(request, { params }) {
    try {
        const supplier = await getSupplierFromToken(request);
        if (!supplier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;

        // Update status to rejected
        await db.query("UPDATE material_requests SET status = 'rejected' WHERE id = ? AND supplier_id = ?", [id, supplier.supplier_id]);

        // Notify Vendor
        try {
            const [mr] = await db.query("SELECT vendor_id, material_name FROM material_requests WHERE id = ?", [id]);
            if (mr.length > 0) {
                const [vendors] = await db.query("SELECT user_id FROM vendors WHERE vendor_id = ?", [mr[0].vendor_id]);
                if (vendors.length > 0) {
                    await db.query(
                        "INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, 'vendor', ?, ?, 'alert')",
                        [vendors[0].user_id, "Request Rejected", `Supplier cannot provide ${mr[0].material_name} at this time.`, "alert"]
                    );
                }
            }
        } catch (err) {
            console.error("Non-fatal notification error:", err);
        }

        return NextResponse.json({ message: "Material not available" });

    } catch (error) {
        console.error("Supplier Reject PUT Error:", error);
        return NextResponse.json({ message: "Unable to update the status of the request" }, { status: 500 });
    }
}
