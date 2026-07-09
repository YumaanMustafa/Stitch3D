import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

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
// PUT HANDLER: Handles PUT requests for src/app/api/supplier/vendor-requests/[id]/accept-renegotiation/route.js
// ==========================================
export async function PUT(request, { params }) {
    try {
        const supplier = await getSupplierFromToken(request);
        if (!supplier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;

        // Verify request belongs to this supplier and status is "renegotiating"
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

        // 1. Update the bill to match the renegotiated price
        await db.query("DELETE FROM bills WHERE request_id = ?", [id]);
        await db.query(`
            INSERT INTO bills (request_id, item_price, tax, shipping, total)
            VALUES (?, ?, 0, 0, ?)
        `, [id, newPrice, newPrice]);

        // 2. Update status of the request to accepted and clear renegotiated_price
        await db.query("UPDATE material_requests SET status = 'accepted', renegotiated_price = NULL WHERE id = ?", [id]);

        // 3. Notify Vendor
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
