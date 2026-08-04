// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import jsonwebtoken to read login tokens
import jwt from 'jsonwebtoken';

/**
 * File: route.js
 * Location: src/app/api/supplier/inventory/[id]/route.js
 * Description: Supplier Single Inventory Item API.
 * This route allows a supplier to update (PUT) or delete (DELETE) a specific 
 * material from their warehouse stock.
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
// PUT HANDLER: Handles PUT requests when a supplier edits an existing material
// ==========================================
export async function PUT(request, { params }) {
    try {
        // Step 1: Grab the ID of the material from the URL
        const { id } = await params;
        
        // Security Check
        const supplier = await getSupplierFromToken(request);
        if (!supplier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Read the newly edited details
        const body = await request.json();
        const { name, type, size, price, stock, image, status } = body;

        // Step 3: Verify Ownership
        // We MUST check that this supplier actually owns the item they are trying to edit!
        const [existing] = await db.query("SELECT id FROM supplier_inventory WHERE id = ? AND supplier_id = ?", [id, supplier.supplier_id]);
        if (!existing.length) return NextResponse.json({ error: "Item not found" }, { status: 404 });

        // Clean up numerical values
        const numPrice = parseFloat(price) || 0;
        const numStock = parseInt(stock) || 0;

        // Step 4: Update the database record with the new details
        await db.query(`
            UPDATE supplier_inventory 
            SET name = ?, type = ?, size = ?, price = ?, stock = ?, image = ?, status = ?
            WHERE id = ? AND supplier_id = ?
        `, [name, type, size, numPrice, numStock, image, status, id, supplier.supplier_id]);

        // Step 5: Fetch the freshly updated item to send back to the frontend
        const [updatedItem] = await db.query("SELECT * FROM supplier_inventory WHERE id = ?", [id]);
        return NextResponse.json(updatedItem[0]);
        
    } catch (error) {
        console.error("Supplier Inventory PUT Error:", error);
        return NextResponse.json({ error: "Failed to update inventory item" }, { status: 500 });
    }
}

// ==========================================
// DELETE HANDLER: Handles DELETE requests when a supplier deletes an item
// ==========================================
export async function DELETE(request, { params }) {
    try {
        // Step 1: Grab the ID of the material to delete from the URL
        const { id } = await params;
        
        // Security Check
        const supplier = await getSupplierFromToken(request);
        if (!supplier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Verify Ownership
        // Ensure they aren't trying to delete another supplier's stock
        const [existing] = await db.query("SELECT id FROM supplier_inventory WHERE id = ? AND supplier_id = ?", [id, supplier.supplier_id]);
        if (!existing.length) return NextResponse.json({ error: "Item not found" }, { status: 404 });

        // Step 3: Delete the record from the database
        await db.query("DELETE FROM supplier_inventory WHERE id = ? AND supplier_id = ?", [id, supplier.supplier_id]);

        // Tell the browser it was successfully removed
        return NextResponse.json({ success: true, message: "Item deleted successfully" });
        
    } catch (error) {
        console.error("Supplier Inventory DELETE Error:", error);
        return NextResponse.json({ error: "Failed to delete inventory item" }, { status: 500 });
    }
}
