import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

/**
 * @file route.js
 * @description Supplier API to accept a vendor request and generate a bill.
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

// ==========================================
// PUT HANDLER: Handles PUT requests for src/app/api/supplier/vendor-requests/[id]/accept/route.js
// ==========================================
export async function PUT(request, { params }) {
    try {
        const supplier = await getSupplierFromToken(request);
        if (!supplier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const body = await request.json();
        const { item_price, tax, shipping, total } = body;

        // Check current status
        const [current] = await db.query("SELECT status FROM material_requests WHERE id = ? AND supplier_id = ?", [id, supplier.supplier_id]);
        if (current.length === 0) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }
        if (current[0].status === 'quoted') {
            return NextResponse.json({ error: "Supplier cannot update the quote while it is under vendor review" }, { status: 400 });
        }

        // 1. Update status to quoted and clear renegotiated_price
        await db.query("UPDATE material_requests SET status = 'quoted', renegotiated_price = NULL WHERE id = ? AND supplier_id = ?", [id, supplier.supplier_id]);

        // 2. Clear any old quoted bills to avoid duplicating the row joins
        await db.query("DELETE FROM bills WHERE request_id = ?", [id]);

        // 3. Create the new bill record
        await db.query(`
            INSERT INTO bills (request_id, item_price, tax, shipping, total)
            VALUES (?, ?, ?, ?, ?)
        `, [id, item_price, tax, shipping, total]);

        // Notify Vendor
        try {
            const [mr] = await db.query("SELECT vendor_id, material_name FROM material_requests WHERE id = ?", [id]);
            if (mr.length > 0) {
                const [vendors] = await db.query("SELECT user_id FROM vendors WHERE vendor_id = ?", [mr[0].vendor_id]);
                if (vendors.length > 0) {
                    await db.query(
                        "INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, 'vendor', ?, ?, 'order')",
                        [vendors[0].user_id, "Quote Received", `Supplier has sent a quote for ${mr[0].material_name}. Total: Rs ${total.toLocaleString()}`, "order"]
                    );
                }
            }
        } catch (err) {
            console.error("Non-fatal notification error:", err);
        }

        return NextResponse.json({ message: "Quotation created and sent to vendor" });

    } catch (error) {
        console.error("Supplier Accept PUT Error:", error);
        return NextResponse.json({ message: "Unable to update the status of the request" }, { status: 500 });
    }
}
