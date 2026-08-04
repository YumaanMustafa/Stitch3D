// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import jsonwebtoken to read login tokens
import jwt from 'jsonwebtoken';

/**
 * File: route.js
 * Location: src/app/api/supplier/inventory/route.js
 * Description: Supplier Inventory API.
 * This route allows a supplier to view their current stock of materials (GET) 
 * and add new types of materials to their warehouse (POST).
 */

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// ==========================================
// HELPER FUNCTION: Verify token and return supplier ID
// ==========================================
async function getSupplierFromToken(request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Only allow suppliers
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
        // Step 1: Security Check. Verify they are logged in as a supplier.
        const supplier = await getSupplierFromToken(request);
        if (!supplier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Fetch everything in the supplier_inventory table owned by this supplier
        const [inventory] = await db.query(`
            SELECT * FROM supplier_inventory 
            WHERE supplier_id = ? 
            ORDER BY created_at DESC
        `, [supplier.supplier_id]);

        // Send the list back to their inventory dashboard
        return NextResponse.json(inventory);
        
    } catch (error) {
        // Log crashes safely
        console.error("Supplier Inventory GET Error:", error);
        return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
    }
}

// =========================================================================
// POST HANDLER: Create a new supplier inventory listing (e.g. adding a new type of Leather)
// =========================================================================
export async function POST(request) {
    try {
        // Step 1: Security Check
        const supplier = await getSupplierFromToken(request);
        if (!supplier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Read the form data they typed in
        const body = await request.json();
        const { name, type, size, price, stock, image, status } = body;

        // Step 3: Validate that they at least gave it a name and a type
        if (!name || !type) {
            return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
        }

        // Step 4: Clean up the numbers so we don't crash the database if they typed letters in the price box
        const numPrice = parseFloat(price) || 0;
        const numStock = parseInt(stock) || 0;

        // Step 5: Save the new material into the database
        const [result] = await db.query(`
            INSERT INTO supplier_inventory (supplier_id, name, type, size, price, stock, image, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [supplier.supplier_id, name, type, size || null, numPrice, numStock, image || null, status || 'Active']);

        // Step 6: Fetch the newly created row from the database (so we have its new ID)
        const [newItem] = await db.query("SELECT * FROM supplier_inventory WHERE id = ?", [result.insertId]);

        // Send it back to the frontend so it can be added to the list without refreshing the page
        return NextResponse.json(newItem[0]);
        
    } catch (error) {
        // Log crashes safely
        console.error("Supplier Inventory POST Error:", error);
        return NextResponse.json({ error: "Failed to add inventory item" }, { status: 500 });
    }
}
