import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

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

export async function PUT(request, { params }) {
    try {
        const vendor = await getVendorFromToken(request);
        if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;

        // Verify request belongs to this vendor and is "quoted"
        const [requests] = await db.query(
            "SELECT id FROM material_requests WHERE id = ? AND vendor_id = ? AND status = 'quoted'",
            [id, vendor.vendor_id]
        );

        if (requests.length === 0) {
            return NextResponse.json({ error: "Request not found or not ready for acceptance" }, { status: 404 });
        }

        // Update status to accepted (Order Placed)
        await db.query("UPDATE material_requests SET status = 'accepted' WHERE id = ?", [id]);

        // Notify Supplier
        try {
            const [mr] = await db.query("SELECT supplier_id, material_name FROM material_requests WHERE id = ?", [id]);
            if (mr.length > 0) {
                const [suppliers] = await db.query("SELECT user_id FROM suppliers WHERE supplier_id = ?", [mr[0].supplier_id]);
                if (suppliers.length > 0) {
                    await db.query(
                        "INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, 'supplier', ?, ?, 'order')",
                        [suppliers[0].user_id, "Quote Accepted", `Vendor has accepted your quote for ${mr[0].material_name}. Prepare for fulfillment.`, "order"]
                    );
                }
            }
        } catch (err) {
            console.error("Non-fatal notification error:", err);
        }

        return NextResponse.json({ message: "Quotation accepted, order placed successfully" });

    } catch (error) {
        console.error("Vendor Accept Quotation PUT Error:", error);
        return NextResponse.json({ message: "Unable to process order" }, { status: 500 });
    }
}
