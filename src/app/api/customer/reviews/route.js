// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import authentication tools
import { getCustomerFromRequest } from '../../../../lib/auth';

/**
 * File: route.js
 * Location: src/app/api/customer/reviews/route.js
 * Description: Customer Reviews API.
 * This route allows customers to submit 1-5 star ratings and reviews for products, 
 * but ONLY if they actually bought the product and it was delivered to them!
 */

// ==========================================
// POST HANDLER: Submit a new product review
// ==========================================
export async function POST(request) {
    try {
        // Step 1: Security Check
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

        // Step 2: Read the review details the customer submitted
        const { productId, rating, reviewText } = await request.json();

        if (!productId || rating === undefined || rating === null) {
            return NextResponse.json({ error: 'Product ID and Rating are required' }, { status: 400 });
        }

        // Step 3: Validate the Rating and Text
        const parsedRating = parseInt(rating, 10);
        // They can't submit a 0-star or 6-star review!
        if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
        }
        // Prevent abuse: limit the review text to 1000 characters
        const safeReviewText = reviewText && reviewText.length > 1000 ? reviewText.substring(0, 1000) : reviewText;

        // Step 4: Ensure the product they are reviewing is a standard shop item
        // (You can't review your own custom 3D jacket design)
        const [productCheck] = await db.query('SELECT id, vendor_id, name FROM vendor_products WHERE id = ?', [productId]);
        if (productCheck.length === 0) {
            return NextResponse.json({ 
                error: 'Invalid Product', 
                message: 'Reviews are only available for standard collection products.' 
            }, { status: 400 });
        }

        // Step 5: The "Verified Buyer" Check
        // We look through all their past orders. We ONLY allow them to review this product IF:
        // 1. They actually ordered it
        // 2. The order status is 'delivered' or 'completed'
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

        if (orderCheck.length === 0) {
            return NextResponse.json({ 
                error: 'Review Restricted', 
                message: 'You can only review products that have been delivered to you.' 
            }, { status: 403 });
        }

        // Step 6: Save the Review
        // We use a "Transaction" here. A transaction ensures that multiple database updates 
        // all succeed together. If one fails, it reverses everything so the database doesn't break.
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Prevent Duplicate Reviews
            // If they already reviewed this item, we just UPDATE their old review instead of making a second one.
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
                await connection.query(
                    'INSERT INTO product_reviews (product_id, customer_id, rating, review_text) VALUES (?, ?, ?, ?)',
                    [productId, customerId, parsedRating, safeReviewText]
                );
            }

            // Step 7: Update the Product's overall rating score
            // Instead of calculating the average rating every single time a customer looks at a product, 
            // we calculate it once right now and save it directly onto the product record.
            const [stats] = await connection.query(
                'SELECT AVG(rating) as avgRating, COUNT(*) as count FROM product_reviews WHERE product_id = ?',
                [productId]
            );
            
            await connection.query(
                'UPDATE vendor_products SET average_rating = ?, total_reviews = ? WHERE id = ?',
                [stats[0].avgRating || 0, stats[0].count || 0, productId]
            );

            // Everything worked! "Commit" the transaction to save it permanently.
            await connection.commit();

            // Step 8: Notify the Vendor
            try {
                const vendorId = productCheck[0].vendor_id;
                const productName = productCheck[0].name;
                
                if (vendorId) {
                    await db.query(
                        "INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, 'vendor', ?, ?, 'message')",
                        [
                            vendorId,
                            "New Product Review",
                            `A customer left a ${parsedRating}-star review on your product: ${productName}.`,
                            "message"
                        ]
                    );
                }
            } catch (err) {
                console.error("Non-fatal notification error:", err);
            }

            // Tell the browser success!
            return NextResponse.json({ success: true, message: 'Review submitted successfully!' });

        } catch (txnError) {
            // If anything inside the try block failed, "rollback" (reverse) the changes
            await connection.rollback();
            throw txnError; 
        } finally {
            // Always release the database connection when done
            connection.release();
        }

    } catch (error) {
        console.error("Review API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}

// ==========================================
// DELETE HANDLER: Delete a review
// ==========================================
export async function DELETE(request) {
    try {
        // Step 1: Security Check
        const payload = getCustomerFromRequest(request);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = payload.id || payload.userId;
        const [customerRows] = await db.query('SELECT customer_id FROM customers WHERE user_id = ?', [userId]);
        
        if (customerRows.length === 0) {
            return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
        }
        
        const customerId = customerRows[0].customer_id;
        
        // Grab the ID of the product from the URL
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');

        if (!productId) {
            return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
        }

        // Step 2: Transaction Setup
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Delete the review
            // We include `customer_id = ?` to guarantee they can only delete their OWN review!
            await connection.query(
                'DELETE FROM product_reviews WHERE product_id = ? AND customer_id = ?',
                [productId, customerId]
            );

            // Step 3: Recalculate the product's overall rating score now that a review is gone
            const [stats] = await connection.query(
                'SELECT AVG(rating) as avgRating, COUNT(*) as count FROM product_reviews WHERE product_id = ?',
                [productId]
            );
            
            await connection.query(
                'UPDATE vendor_products SET average_rating = ?, total_reviews = ? WHERE id = ?',
                [stats[0].avgRating || 0, stats[0].count || 0, productId]
            );

            // Save the changes permanently
            await connection.commit();
            
            return NextResponse.json({ success: true, message: 'Review deleted successfully!' });

        } catch (txnError) {
            await connection.rollback();
            throw txnError;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Review Delete API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}
