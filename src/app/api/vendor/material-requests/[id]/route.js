// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database connection tool
import db from '@/lib/db';
// Import authentication tools
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/vendor/material-requests/[id]/route.js
 * Description: Single Material Request API.
 * This route allows a Vendor to update (PUT) or delete (DELETE) a specific 
 * material order they have placed with a Supplier.
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
// PUT HANDLER: Update an existing material request (e.g. changing quantity or urgency)
// ==========================================
export async function PUT(request, { params }) {
    try {
        // Step 1: Security Check
        const vendorId = await getVendorId(request);
        if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Grab the ID from the URL and read the new data from the form
        const { id } = await params;
        const body = await request.json();
        const { material_name, type, quantity, size, urgency, supplier_id } = body;

        // Step 3: Update the record in the database
        // We include `vendor_id = ?` to guarantee they can only edit their own requests.
        // We also force the status back to 'pending' because the supplier needs to review the changes.
        await db.query(`
            UPDATE material_requests 
            SET material_name = ?, type = ?, quantity = ?, size = ?, urgency = ?, supplier_id = ?, status = 'pending'
            WHERE id = ? AND vendor_id = ?
        `, [material_name, type, quantity, size, urgency, supplier_id, id, vendorId]);

        return NextResponse.json({ message: "Updated successfully" });
        
    } catch (err) {
        // Log severe crashes safely
        console.error("Vendor MR PUT Error:", err);
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}

// ==========================================
// DELETE HANDLER: Delete (cancel) a material request
// ==========================================
export async function DELETE(request, { params }) {
    try {
        // Step 1: Security Check
        const vendorId = await getVendorId(request);
        if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Grab the ID of the request to cancel
        const { id } = await params;
        
        // Step 3: Delete it from the database
        // Again, `vendor_id = ?` ensures they can't delete someone else's order!
        await db.query("DELETE FROM material_requests WHERE id = ? AND vendor_id = ?", [id, vendorId]);

        return NextResponse.json({ message: "Deleted successfully" });
        
    } catch (err) {
        // Log severe crashes safely
        console.error("Vendor MR DELETE Error:", err);
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
