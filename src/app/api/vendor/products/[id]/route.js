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

// PUT: Update product
export async function PUT(request, { params }) {
    try {
        const vendorId = await getVendorId(request);
        if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const body = await request.json();
        const { name, price, stock, category, image, status } = body;

        // Using db.query for better compatibility
        const [result] = await db.query(
            "UPDATE vendor_products SET name=?, price=?, stock=?, category=?, image=?, status=? WHERE id=? AND vendor_id=?",
            [name, price, stock, category, image, status, id, vendorId]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: "Product not found or unauthorized" }, { status: 404 });
        }

        return NextResponse.json({ id, ...body });
    } catch (error) {
        console.error("Product Update Error:", error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}

// DELETE: Remove product
export async function DELETE(request, { params }) {
    try {
        const vendorId = await getVendorId(request);
        if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const [result] = await db.query("DELETE FROM vendor_products WHERE id=? AND vendor_id=?", [id, vendorId]);

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: "Product not found or unauthorized" }, { status: 404 });
        }

        return NextResponse.json({ message: "Deleted successfully" });
    } catch (error) {
        console.error("Product Delete Error:", error);
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}
