// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import authentication tools
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/vendor/products/[id]/route.js
 * Description: Vendor Single Product API.
 * This route allows a Vendor to update (PUT) or delete (DELETE) a specific 
 * product listing from their shop.
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
// PUT HANDLER: Update an existing product listing
// ==========================================
export async function PUT(request, { params }) {
    try {
        // Step 1: Security Check
        const vendorId = await getVendorId(request);
        if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Grab the Product ID from the URL and read the new data from the form
        const { id } = await params;
        const body = await request.json();
        const { name, price, stock, category, image, status } = body;

        // Step 3: Update the record in the database
        // We include `vendor_id=?` to absolutely guarantee they can only edit their own products
        const [result] = await db.query(
            "UPDATE vendor_products SET name=?, price=?, stock=?, category=?, image=?, status=? WHERE id=? AND vendor_id=?",
            [name, price, stock, category, image, status, id, vendorId]
        );

        // If affectedRows is 0, they tried to edit a product that isn't theirs
        if (result.affectedRows === 0) {
            return NextResponse.json({ error: "Product not found or unauthorized" }, { status: 404 });
        }

        // Tell the browser the update was successful
        return NextResponse.json({ id, ...body });
        
    } catch (error) {
        console.error("Product Update Error:", error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}

// ==========================================
// DELETE HANDLER: Remove a product from the shop
// ==========================================
export async function DELETE(request, { params }) {
    try {
        // Step 1: Security Check
        const vendorId = await getVendorId(request);
        if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Grab the ID of the product to delete
        const { id } = await params;
        
        // Step 3: Delete it from the database
        // Again, `vendor_id=?` protects competitors from deleting each other's products
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
