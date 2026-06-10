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
        if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const body = await request.json();
        const { material_name, type, quantity, size, urgency, supplier_id } = body;

        await db.query(`
            UPDATE material_requests 
            SET material_name = ?, type = ?, quantity = ?, size = ?, urgency = ?, supplier_id = ?, status = 'pending'
            WHERE id = ? AND vendor_id = ?
        `, [material_name, type, quantity, size, urgency, supplier_id, id, vendorId]);

        return NextResponse.json({ message: "Updated successfully" });
    } catch (err) {
        console.error("Vendor MR PUT Error:", err);
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const vendorId = await getVendorId(request);
        if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        await db.query("DELETE FROM material_requests WHERE id = ? AND vendor_id = ?", [id, vendorId]);

        return NextResponse.json({ message: "Deleted successfully" });
    } catch (err) {
        console.error("Vendor MR DELETE Error:", err);
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
