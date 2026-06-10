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

export async function GET(request) {
    try {
        const vendor = await getVendorFromToken(request);
        if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const [requests] = await db.query(`
            SELECT mr.*, s_user.first_name as supplier_first_name, s_user.last_name as supplier_last_name, 
                   b.item_price, b.tax, b.shipping, b.total
            FROM material_requests mr
            JOIN suppliers s ON mr.supplier_id = s.supplier_id
            JOIN users s_user ON s.user_id = s_user.user_id
            LEFT JOIN bills b ON mr.id = b.request_id
            WHERE mr.vendor_id = ?
            ORDER BY mr.created_at DESC
        `, [vendor.vendor_id]);

        return NextResponse.json(requests);
    } catch (error) {
        console.error("Vendor Requests GET Error:", error);
        return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const vendor = await getVendorFromToken(request);
        if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const { material_name, type, quantity, size, urgency, supplier_id } = body;

        // Validation based on requirement: "All necessary fields must be filled"
        if (!material_name || !type || !quantity || !size || !urgency || !supplier_id) {
            return NextResponse.json({ message: "All necessary fields must be filled" }, { status: 400 });
        }

        const [result] = await db.query(`
            INSERT INTO material_requests (vendor_id, supplier_id, material_name, type, quantity, size, urgency, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `, [vendor.vendor_id, supplier_id, material_name, type, quantity, size, urgency]);

        // Notify Supplier
        try {
            const [suppliers] = await db.query("SELECT user_id FROM suppliers WHERE supplier_id = ?", [supplier_id]);
            if (suppliers.length > 0) {
                await db.query(
                    "INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, 'supplier', ?, ?, 'request')",
                    [suppliers[0].user_id, "New Material Request", `A vendor has requested ${quantity}x ${material_name}.`, "request"]
                );
            }
        } catch (err) {
            console.error("Non-fatal notification error:", err);
        }

        return NextResponse.json({ 
            message: "Material request generated successfully", 
            requestId: result.insertId 
        }, { status: 201 });

    } catch (error) {
        console.error("Vendor Requests POST Error:", error);
        return NextResponse.json({ 
            message: "Unable to generate material request, please try again later" 
        }, { status: 500 });
    }
}
