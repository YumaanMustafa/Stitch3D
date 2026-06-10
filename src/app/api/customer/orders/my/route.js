import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

/**
 * @file route.js
 * @description Customer Order History API.
 * Fetches all orders placed by the authenticated customer.
 * Includes order items and summary details.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export async function GET(request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const userId = decoded.id || decoded.userId || decoded.user_id;

        const [orders] = await db.query(`
            SELECT 
                o.order_id,
                CONCAT('ORD-', o.order_id) as display_id,
                o.created_at,
                o.total,
                o.status,
                o.shipping_method as shipping,
                COUNT(oi.item_id) as items_count
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            WHERE c.user_id = ?
            GROUP BY o.order_id
            ORDER BY o.created_at DESC
        `, [userId]);

        for (let order of orders) {
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

            order.items = items;
            order.image = items.length > 0 ? items[0].image : '';
            order.can_cancel = order.status === 'pending';
            order.can_reorder = true;
            // Use display_id as the primary id for the frontend
            order.id = order.display_id;
        }

        return NextResponse.json(orders);
    } catch (error) {
        console.error("Fetch orders failed:", error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}
