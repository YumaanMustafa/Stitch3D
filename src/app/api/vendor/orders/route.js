import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

/**
 * @file route.js
 * @description Vendor Orders List API.
 * Fetches all orders strictly belonging to the authenticated vendor.
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

export async function GET(request) {
    try {
        const vendorId = await getVendorId(request);
        if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Query 'orders' table. Ideally filtering by vendor_id if exists.
        // Checking schema via assumption: orders usually have items, items have products, products have vendor_id.
        // For MVP/Demo as per file, it was fetching ALL. We keep fetching ALL but protected.
        // TODO: Filter by vendor ownership in real query.

        const sql = `
        SELECT 
            o.order_id,
            o.total,
            o.created_at,
            o.status,
            u.first_name,
            u.last_name,
            u.email,
            (
                SELECT COUNT(*)
                FROM order_items oi_sub
                WHERE oi_sub.order_id = o.order_id
                AND oi_sub.vendor_id = ?
            ) as items_count,
            (SELECT img_src FROM order_items oi WHERE oi.order_id = o.order_id LIMIT 1) as img_src,
            (SELECT title FROM order_items oi WHERE oi.order_id = o.order_id LIMIT 1) as item_title,
            (SELECT color FROM order_items oi WHERE oi.order_id = o.order_id LIMIT 1) as color,
            (SELECT material FROM order_items oi WHERE oi.order_id = o.order_id LIMIT 1) as material,
            (SELECT design_id FROM order_items oi WHERE oi.order_id = o.order_id LIMIT 1) as design_id
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.customer_id
        LEFT JOIN users u ON c.user_id = u.user_id
        WHERE o.vendor_id = ?
        ORDER BY o.created_at DESC
        `;

        const [rows] = await db.execute(sql, [vendorId, vendorId]);

        const orders = rows.map(row => ({
            id: row.order_id,
            customer: row.first_name ? `${row.first_name} ${row.last_name}` : (row.email || "Unknown Customer"),
            date: new Date(row.created_at).toLocaleDateString(),
            total: `Rs ${row.total}`,
            status: row.status || "Processing",
            items: row.items_count || 1,
            is_custom: row.design_id ? String(row.design_id).startsWith('design_') : false,
            design_id: row.design_id,
            title: row.item_title || "Standard Order",
            color: row.color || "N/A",
            material: row.material || "N/A",
            image: row.img_src || "https://images.unsplash.com/photo-1591561954557-26941169b49e?q=80&w=200"
        }));

        return NextResponse.json(orders);
    } catch (error) {
        console.error("Orders API Error:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}
