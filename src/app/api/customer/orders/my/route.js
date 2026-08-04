// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import jsonwebtoken to read login tokens
import jwt from 'jsonwebtoken';

/**
 * File: route.js
 * Location: src/app/api/customer/orders/my/route.js
 * Description: Customer Order History API.
 * This route fetches all the past orders for the logged-in customer so they 
 * can view them in their dashboard. It summarizes the items in each order.
 */

// Get the secret key used to lock and unlock the JWT token
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// ==========================================
// GET HANDLER: Handles GET requests when a customer visits their "My Orders" page
// ==========================================
export async function GET(request) {
    try {
        // Step 1: Security Check. Verify the user is logged in.
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Extract the token and unlock it
        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Find the user's ID
        const userId = decoded.id || decoded.userId || decoded.user_id;

        // Step 2: Fetch the master list of Orders for this customer
        // We JOIN the customers table to find their specific customer_id.
        // We use COUNT() to easily figure out how many total items are in the order.
        const [orders] = await db.query(`
            SELECT 
                o.order_id,
                CONCAT('ORD-', o.order_id) as display_id,
                o.created_at,
                o.total,
                o.status,
                o.shipping_method as shipping,
                v.user_id as vendor_user_id,
                COUNT(oi.item_id) as items_count
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            LEFT JOIN vendors v ON o.vendor_id = v.vendor_id
            WHERE c.user_id = ?
            GROUP BY o.order_id, v.user_id
            ORDER BY o.created_at DESC
        `, [userId]);

        // Step 3: For every single order we found, fetch the specific items inside it
        // We use a "for loop" to go through the list one by one
        for (let order of orders) {
            
            // Get the list of items (shirts, hats, etc.) inside this specific order
            const [items] = await db.query(`
                SELECT 
                    title as name,
                    quantity as qty,
                    price,
                    img_src as image,
                    design_id
                FROM order_items
                WHERE order_id = ?
            `, [order.order_id]);

            // Attach the items to the order object so the frontend can read them
            order.items = items;
            
            // Use the image of the first item as the thumbnail picture for the whole order
            order.image = items.length > 0 ? items[0].image : '';
            
            // Set some helpful true/false flags for the frontend UI buttons
            order.can_cancel = order.status === 'pending'; // They can only cancel if it hasn't shipped yet
            order.can_reorder = true;
            
            // Make the public facing ID look pretty (e.g. ORD-15 instead of just 15)
            order.id = order.display_id;
        }

        // Step 4: Send the fully assembled list of orders back to the browser
        return NextResponse.json(orders);
        
    } catch (error) {
        // Log any database crashes securely
        console.error("Fetch orders failed:", error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}
