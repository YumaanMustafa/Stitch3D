import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

/**
 * @file route.js
 * @description Vendor Order Details API.
 * Fetches specific details and items for an order, strictly filtered by vendor_id.
 */

async function getVendorId(request) {
    try {
        const payload = getVendorFromRequest(request);
        if (!payload) return null;
        return await getVendorIdFromUser(payload);
    } catch (e) {
        return null;
    }
}

export async function GET(request, { params }) {
    try {
        const vendorId = await getVendorId(request);
        if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const resolvedParams = await params;
        const rawOrderId = resolvedParams.id;
        // Strip the ORD- prefix if the frontend sends it that way
        const orderId = rawOrderId.replace('ORD-', '');

        // 1. Fetch Order Items
        const [items] = await db.execute(
            `SELECT title, color, material, price, quantity, img_src as image
             FROM order_items 
             WHERE order_id = ? AND vendor_id = ?`,
            [orderId, vendorId]
        );

        if (items.length === 0) {
             return NextResponse.json({ error: "Order not found or access denied." }, { status: 404 });
        }

        // 2. Format Response
        return NextResponse.json({ items });

    } catch (error) {
        console.error("Order Details API Error:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}
