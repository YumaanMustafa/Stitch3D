// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import authentication tools
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/vendor/orders/[id]/route.js
 * Description: Vendor Order Details API.
 * This route allows a Vendor to click on a specific order and view exactly 
 * what items (jackets, shirts, hats) the customer purchased from them.
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
// GET HANDLER: Fetch all the items inside one specific order
// ==========================================
export async function GET(request, { params }) {
    try {
        // Step 1: Security Check
        const vendorId = await getVendorId(request);
        if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Grab the ID from the URL (e.g. /api/vendor/orders/ORD-15)
        const resolvedParams = await params;
        const rawOrderId = resolvedParams.id;
        
        // Strip the "ORD-" prefix if the frontend sent it that way. 
        // The database just wants the raw number (e.g. "15").
        const orderId = rawOrderId.replace('ORD-', '');

        // Step 3: Fetch the Order Items
        // We MUST include `vendor_id = ?` here. An order might have items from 3 different 
        // vendors in it. This ensures THIS vendor only sees the items they are supposed to make!
        const [items] = await db.execute(
            `SELECT title, color, material, price, quantity, img_src as image
             FROM order_items 
             WHERE order_id = ? AND vendor_id = ?`,
            [orderId, vendorId]
        );

        // If no items were found, it either means the order doesn't exist, 
        // or the order exists but doesn't contain any items belonging to this vendor.
        if (items.length === 0) {
             return NextResponse.json({ error: "Order not found or access denied." }, { status: 404 });
        }

        // Step 4: Send the items list back to the browser
        return NextResponse.json({ items });

    } catch (error) {
        // Log severe crashes safely
        console.error("Order Details API Error:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}
