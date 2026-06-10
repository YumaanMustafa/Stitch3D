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

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const supplier = await getSupplierFromToken(request);
        if (!supplier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const { name, type, size, price, stock, image, status } = body;

        // Verify ownership
        const [existing] = await db.query("SELECT id FROM supplier_inventory WHERE id = ? AND supplier_id = ?", [id, supplier.supplier_id]);
        if (!existing.length) return NextResponse.json({ error: "Item not found" }, { status: 404 });

        const numPrice = parseFloat(price) || 0;
        const numStock = parseInt(stock) || 0;

        await db.query(`
            UPDATE supplier_inventory 
            SET name = ?, type = ?, size = ?, price = ?, stock = ?, image = ?, status = ?
            WHERE id = ? AND supplier_id = ?
        `, [name, type, size, numPrice, numStock, image, status, id, supplier.supplier_id]);

        const [updatedItem] = await db.query("SELECT * FROM supplier_inventory WHERE id = ?", [id]);
        return NextResponse.json(updatedItem[0]);
    } catch (error) {
        console.error("Supplier Inventory PUT Error:", error);
        return NextResponse.json({ error: "Failed to update inventory item" }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const supplier = await getSupplierFromToken(request);
        if (!supplier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Verify ownership
        const [existing] = await db.query("SELECT id FROM supplier_inventory WHERE id = ? AND supplier_id = ?", [id, supplier.supplier_id]);
        if (!existing.length) return NextResponse.json({ error: "Item not found" }, { status: 404 });

        await db.query("DELETE FROM supplier_inventory WHERE id = ? AND supplier_id = ?", [id, supplier.supplier_id]);

        return NextResponse.json({ success: true, message: "Item deleted successfully" });
    } catch (error) {
        console.error("Supplier Inventory DELETE Error:", error);
        return NextResponse.json({ error: "Failed to delete inventory item" }, { status: 500 });
    }
}
