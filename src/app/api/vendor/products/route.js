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

// GET: Fetch ONLY this vendor's products
export async function GET(request) {
    try {
        const vendorId = await getVendorId(request);
        if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const [rows] = await db.execute("SELECT * FROM vendor_products WHERE vendor_id = ? ORDER BY created_at DESC", [vendorId]);
        return NextResponse.json(rows);
    } catch (error) {
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}

// POST: Create a new product for THIS vendor
export async function POST(request) {
    try {
        const vendorId = await getVendorId(request);
        if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const { name, price, stock, category, image, status } = body;

        // Validation
        if (!name || !price || !category) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const values = [
            vendorId,
            name,
            parseFloat(price) || 0,
            parseInt(stock) || 0,
            category,
            image || "https://images.unsplash.com/photo-1551028919-ac7fa7ea40bd?q=80&w=200",
            status || "Active"
        ];

        console.log("Attempting Insert:", values);

        // Using db.query instead of execute for stability
        const [result] = await db.query(
            "INSERT INTO vendor_products (vendor_id, name, price, stock, category, image, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            values
        );

        return NextResponse.json({ id: result.insertId, vendor_id: vendorId, ...body }, { status: 201 });
    } catch (error) {
        console.error("Create Product Error:", error.message, error.stack);
        return NextResponse.json({
            error: "Failed to create product",
            details: error.message
        }, { status: 500 });
    }
}

