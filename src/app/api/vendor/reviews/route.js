import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

/**
 * @file route.js
 * @description Vendor Reviews Management API.
 * Fetches all reviews for products belonging to the authenticated vendor.
 */

export async function GET(request) {
    try {
        const payload = getVendorFromRequest(request);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const vendorId = await getVendorIdFromUser(payload);
        if (!vendorId) {
            return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 });
        }

        // Fetch all reviews for this vendor's products
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

        return NextResponse.json(reviews);

    } catch (error) {
        console.error("Vendor Reviews API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * Reply to a review
 */
export async function POST(request) {
    try {
        const payload = getVendorFromRequest(request);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const vendorId = await getVendorIdFromUser(payload);
        const { reviewId, replyText } = await request.json();

        if (!reviewId || !replyText) {
            return NextResponse.json({ error: 'Review ID and Reply Text are required' }, { status: 400 });
        }

        // Verify the review belongs to this vendor's product
        const [reviewCheck] = await db.query(`
            SELECT pr.id 
            FROM product_reviews pr
            JOIN vendor_products vp ON pr.product_id = vp.id
            WHERE pr.id = ? AND vp.vendor_id = ?
        `, [reviewId, vendorId]);

        if (reviewCheck.length === 0) {
            return NextResponse.json({ error: 'Unauthorized or Review not found' }, { status: 403 });
        }

        await db.query(
            'UPDATE product_reviews SET vendor_reply = ? WHERE id = ?',
            [replyText, reviewId]
        );

        return NextResponse.json({ success: true, message: 'Reply posted successfully!' });

    } catch (error) {
        console.error("Vendor Reply Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
