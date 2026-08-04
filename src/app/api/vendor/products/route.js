// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import authentication tools
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/vendor/products/route.js
 * Description: Vendor Products API.
 * This route allows a Vendor to view all the products they are selling (GET), 
 * and allows them to list new products for sale (POST).
 */

// ==========================================
// HELPER FUNCTION: Verify Token and get Vendor ID
// ==========================================
async function getVendorId(request) {
    try {
        const payload = getVendorFromRequest(request);
        if (!payload) return null;
        return await getVendorIdFromUser(payload);
    } catch (e) {
        return null;
    }
}

// ==========================================
// GET HANDLER: Fetch all products belonging to this vendor
// ==========================================
export async function GET(request) {
    try {
        // Step 1: Security Check
        const vendorId = await getVendorId(request);
        if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Fetch products from the database
        // The `vendor_id = ?` ensures they don't see a competitor's products
        const [rows] = await db.execute("SELECT * FROM vendor_products WHERE vendor_id = ? ORDER BY created_at DESC", [vendorId]);
        
        // Send the list to the browser
        return NextResponse.json(rows);
    } catch (error) {
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}

// ==========================================
// POST HANDLER: Create a brand new product listing
// ==========================================
export async function POST(request) {
    try {
        // Step 1: Security Check
        const vendorId = await getVendorId(request);
        if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Read the product details from the form
        const body = await request.json();
        const { name, price, stock, category, image, status } = body;

        // Step 3: Validate that the essential info was provided
        if (!name || !price || !category) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Step 4: Prepare the data safely
        // We use parseFloat and parseInt to make sure users didn't type text into the number boxes
        const values = [
            vendorId,
            name,
            parseFloat(price) || 0,
            parseInt(stock) || 0,
            category,
            // If they didn't upload an image, provide a generic placeholder
            image || "https://images.unsplash.com/photo-1551028919-ac7fa7ea40bd?q=80&w=200",
            status || "Active"
        ];

        console.log("Attempting Insert:", values);

        // Step 5: Save the new product into the database
        const [result] = await db.query(
            "INSERT INTO vendor_products (vendor_id, name, price, stock, category, image, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            values
        );

        // Step 6: Return success, and include the newly generated product ID
        return NextResponse.json({ id: result.insertId, vendor_id: vendorId, ...body }, { status: 201 });
        
    } catch (error) {
        // Log crashes safely
        console.error("Create Product Error:", error.message, error.stack);
        return NextResponse.json({
            error: "Failed to create product",
            details: error.message
        }, { status: 500 });
    }
}
