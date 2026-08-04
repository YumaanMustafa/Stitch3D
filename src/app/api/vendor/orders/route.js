// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import authentication tools
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/vendor/orders/route.js
 * Description: Vendor Orders List API.
 * This route fetches all the active orders that customers have placed 
 * with this specific Vendor's shop, so the Vendor can see what they need to make and ship.
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
// GET HANDLER: Fetch all customer orders belonging to this vendor
// ==========================================
export async function GET(request) {
    try {
        // Step 1: Security Check
        const vendorId = await getVendorId(request);
        if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Build the SQL Query
        // This is a complex query that does several things at once:
        // - Fetches the main order details (total price, date, status)
        // - Fetches the customer's name and email
        // - Counts exactly how many items in this order belong specifically to THIS vendor
        // - Grabs a "preview image" and details from the very first item to use as a thumbnail
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
            (SELECT size FROM order_items oi WHERE oi.order_id = o.order_id LIMIT 1) as size,
            (SELECT design_id FROM order_items oi WHERE oi.order_id = o.order_id LIMIT 1) as design_id
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.customer_id
        LEFT JOIN users u ON c.user_id = u.user_id
        WHERE o.vendor_id = ?
        ORDER BY o.created_at DESC
        `;

        // Execute the query
        // We pass vendorId twice because there are two '?' placeholders in the query
        const [rows] = await db.execute(sql, [vendorId, vendorId]);

        // Step 3: Format the data beautifully for the frontend UI
        // We rename some fields (like 'order_id' to 'id') and handle missing data safely
        const orders = rows.map(row => ({
            id: row.order_id,
            // Format customer name properly. If missing, use their email instead.
            customer: row.first_name ? `${row.first_name} ${row.last_name}` : (row.email || "Unknown Customer"),
            date: new Date(row.created_at).toLocaleDateString(),
            total: `Rs ${row.total}`,
            status: row.status || "Processing",
            items: row.items_count || 1,
            // Check if this is a custom 3D jacket or a standard ready-to-wear product
            is_custom: row.design_id != null && isNaN(Number(row.design_id)),
            design_id: row.design_id,
            title: row.item_title || "Standard Order",
            color: row.color || "N/A",
            material: row.material || "N/A",
            size: row.size || null,
            // If they don't have a picture, provide a placeholder fallback image
            image: row.img_src || "https://images.unsplash.com/photo-1591561954557-26941169b49e?q=80&w=200"
        }));

        // Step 4: Send the fully assembled list back to the browser
        return NextResponse.json(orders);
        
    } catch (error) {
        // Log severe database crashes securely
        console.error("Orders API Error:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}
