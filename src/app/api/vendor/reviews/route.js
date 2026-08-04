// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import authentication tools
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/vendor/reviews/route.js
 * Description: Vendor Reviews Management API.
 * This route fetches all the customer reviews left on this specific Vendor's 
 * products (GET), and allows the Vendor to post public replies to those reviews (POST).
 */

// ==========================================
// GET HANDLER: Fetch all customer reviews for this vendor's products
// ==========================================
export async function GET(request) {
    try {
        // Step 1: Security Check
        const payload = getVendorFromRequest(request);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const vendorId = await getVendorIdFromUser(payload);
        if (!vendorId) {
            return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 });
        }

        // Step 2: Fetch the reviews from the database
        // We JOIN the vendor_products table to make sure we ONLY pull reviews 
        // for products that actually belong to this vendor (`vp.vendor_id = ?`).
        // We also JOIN the customers and users tables to get the name of the person who wrote it.
        const [reviews] = await db.query(`
            SELECT 
                pr.id,
                pr.rating,
                pr.review_text as comment,
                pr.created_at,
                vp.name as product_name,
                vp.id as product_id,
                u.first_name,
                u.last_name,
                pr.vendor_reply
            FROM product_reviews pr
            JOIN vendor_products vp ON pr.product_id = vp.id
            JOIN customers c ON pr.customer_id = c.customer_id
            JOIN users u ON c.user_id = u.user_id
            WHERE vp.vendor_id = ?
            ORDER BY pr.created_at DESC
        `, [vendorId]);

        // Send the list of reviews back to the vendor's dashboard
        return NextResponse.json(reviews);

    } catch (error) {
        // Log severe crashes safely
        console.error("Vendor Reviews API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// ==========================================
// POST HANDLER: Reply to a customer's review
// ==========================================
export async function POST(request) {
    try {
        // Step 1: Security Check
        const payload = getVendorFromRequest(request);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const vendorId = await getVendorIdFromUser(payload);
        
        // Step 2: Read the form data (Which review are we replying to, and what does the reply say?)
        const { reviewId, replyText } = await request.json();

        // Ensure they actually wrote something
        if (!reviewId || !replyText) {
            return NextResponse.json({ error: 'Review ID and Reply Text are required' }, { status: 400 });
        }

        // Step 3: Verify Ownership
        // We MUST check that the review they are trying to reply to actually 
        // belongs to one of their own products!
        const [reviewCheck] = await db.query(`
            SELECT pr.id 
            FROM product_reviews pr
            JOIN vendor_products vp ON pr.product_id = vp.id
            WHERE pr.id = ? AND vp.vendor_id = ?
        `, [reviewId, vendorId]);

        // If the array is empty, they either gave a fake ID or tried to reply to a competitor's review.
        if (reviewCheck.length === 0) {
            return NextResponse.json({ error: 'Unauthorized or Review not found' }, { status: 403 });
        }

        // Step 4: Save the reply in the database
        await db.query(
            'UPDATE product_reviews SET vendor_reply = ? WHERE id = ?',
            [replyText, reviewId]
        );

        // Tell the browser the reply was posted
        return NextResponse.json({ success: true, message: 'Reply posted successfully!' });

    } catch (error) {
        // Log severe crashes safely
        console.error("Vendor Reply Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
