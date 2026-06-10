import { NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * @file route.js
 * @description Public Reviews Fetch API.
 * Fetches reviews and aggregated stats for a specific product.
 */

export async function GET(request, { params }) {
    try {
        const { productId } = await params;

        if (!productId) {
            return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
        }

        // Fetch Individual Reviews
        const [reviews] = await db.query(`
            SELECT 
                r.id,
                r.product_id,
                r.customer_id,
                r.rating,
                r.review_text as comment,
                r.vendor_reply,
                r.created_at,
                u.first_name,
                u.last_name
            FROM product_reviews r
            JOIN customers c ON r.customer_id = c.customer_id
            JOIN users u ON c.user_id = u.user_id
            WHERE r.product_id = ?
            ORDER BY r.created_at DESC
        `, [productId]);

        // Fetch Aggregated Stats
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as reviewCount,
                IFNULL(AVG(rating), 0) as averageRating
            FROM product_reviews
            WHERE product_id = ?
        `, [productId]);

        return NextResponse.json({
            reviews,
            stats: {
                reviewCount: stats[0].reviewCount,
                averageRating: Number(stats[0].averageRating).toFixed(1)
            }
        });

    } catch (error) {
        console.error("Public Reviews Fetch Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
