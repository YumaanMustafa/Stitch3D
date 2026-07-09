import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Helper to extract JWT token, verify supplier role, and return the supplier_id
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

// =========================================================================
// GET HANDLER: Fetch all inventory items (materials) supplied by this supplier
// =========================================================================
export async function GET(request) {
    try {
        // 1. Authenticate supplier credentials
        const supplier = await getSupplierFromToken(request);
        if (!supplier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // 2. Fetch inventory entries matching supplier_id from DB
        const [inventory] = await db.query(`
            SELECT * FROM supplier_inventory 
            WHERE supplier_id = ? 
            ORDER BY created_at DESC
        `, [supplier.supplier_id]);

        return NextResponse.json(inventory);
    } catch (error) {
        console.error("Supplier Inventory GET Error:", error);
        return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
    }
}

// =========================================================================
// POST HANDLER: Create a new supplier inventory listing (fabric/material stock)
// =========================================================================
export async function POST(request) {
    try {
        // 1. Authenticate supplier credentials
        const supplier = await getSupplierFromToken(request);
        if (!supplier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const { name, type, size, price, stock, image, status } = body;

        // 2. Enforce core fields verification
        if (!name || !type) {
            return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
        }

        // 3. Parse numerical values safely
        const numPrice = parseFloat(price) || 0;
        const numStock = parseInt(stock) || 0;

        // 4. Insert new inventory row into supplier_inventory
        const [result] = await db.query(`
            INSERT INTO supplier_inventory (supplier_id, name, type, size, price, stock, image, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [supplier.supplier_id, name, type, size || null, numPrice, numStock, image || null, status || 'Active']);

        // 5. Query and return the completed row data
        const [newItem] = await db.query("SELECT * FROM supplier_inventory WHERE id = ?", [result.insertId]);

        return NextResponse.json(newItem[0]);
    } catch (error) {
        console.error("Supplier Inventory POST Error:", error);
        return NextResponse.json({ error: "Failed to add inventory item" }, { status: 500 });
    }
}
