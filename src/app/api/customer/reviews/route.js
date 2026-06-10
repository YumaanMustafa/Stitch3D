import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCustomerFromRequest } from '../../../../lib/auth';

/**
 * @file route.js
 * @description Customer Reviews API.
 * Allows customers to submit reviews for products they have purchased and received.
 */

export async function POST(request) {
    try {
        const payload = getCustomerFromRequest(request);
        console.log("Review API: Payload", payload);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = payload.id || payload.userId;
        const [customerRows] = await db.query('SELECT customer_id FROM customers WHERE user_id = ?', [userId]);
        
        if (customerRows.length === 0) {
            return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
        }
        
        const customerId = customerRows[0].customer_id;

        const { productId, rating, reviewText } = await request.json();

        if (!productId || rating === undefined || rating === null) {
            return NextResponse.json({ error: 'Product ID and Rating are required' }, { status: 400 });
        }

        // 1. Validation
        const parsedRating = parseInt(rating, 10);
        if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
        }
        const safeReviewText = reviewText && reviewText.length > 1000 ? reviewText.substring(0, 1000) : reviewText;

        // 2. Explicitly verify this is a Standard Vendor Product (not a custom design)
        const [productCheck] = await db.query('SELECT id FROM vendor_products WHERE id = ?', [productId]);
        if (productCheck.length === 0) {
            return NextResponse.json({ 
                error: 'Invalid Product', 
                message: 'Reviews are only available for standard collection products.' 
            }, { status: 400 });
        }

        console.log("Review API: Checking order for customer", customerId, "product", productId);
        const [orderCheck] = await db.query(`
            SELECT o.order_id 
            FROM orders o
            JOIN order_items oi ON o.order_id = oi.order_id
            WHERE o.customer_id = ? 
            AND oi.design_id = ?
            AND (o.status = 'delivered' OR o.status = 'completed')
            LIMIT 1
        `, [customerId, productId]);

        console.log("Review API: Order check result", orderCheck);

        if (orderCheck.length === 0) {
            return NextResponse.json({ 
                error: 'Review Restricted', 
                message: 'You can only review products that have been delivered to you.' 
            }, { status: 403 });
        }

        // 3. Transactions for Review Insertion & Cache Update
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Prevent Duplicate Reviews
            const [existingReview] = await connection.query(
                'SELECT id FROM product_reviews WHERE product_id = ? AND customer_id = ?',
                [productId, customerId]
            );

            if (existingReview.length > 0) {
                await connection.query(
                    'UPDATE product_reviews SET rating = ?, review_text = ?, created_at = NOW() WHERE id = ?',
                    [parsedRating, safeReviewText, existingReview[0].id]
                );
            } else {
                // Insert Review
                await connection.query(
                    'INSERT INTO product_reviews (product_id, customer_id, rating, review_text) VALUES (?, ?, ?, ?)',
                    [productId, customerId, parsedRating, safeReviewText]
                );
            }

            // Update Product Cache Columns (Optimization)
            const [stats] = await connection.query(
                'SELECT AVG(rating) as avgRating, COUNT(*) as count FROM product_reviews WHERE product_id = ?',
                [productId]
            );
            
            await connection.query(
                'UPDATE vendor_products SET average_rating = ?, total_reviews = ? WHERE id = ?',
                [stats[0].avgRating || 0, stats[0].count || 0, productId]
            );

            await connection.commit();
            return NextResponse.json({ success: true, message: 'Review submitted successfully!' });

        } catch (txnError) {
            await connection.rollback();
            throw txnError; // Pass to outer catch block for standard error response
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error("Review API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
