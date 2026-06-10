import { NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * @file route.js
 * @description Trending Products API.
 * Fetches the 10 most recent active products to display as "Trending" on the home page.
 */

export async function GET(request) {
    try {
        // Fetch active vendor products, ordered by newest first (as a proxy for trending for now)
        // In a real app, you might sort by sales count or views.
        const [products] = await db.query(`
            SELECT id, name, price, stock, category, image, status, created_at, average_rating, total_reviews
            FROM vendor_products
            WHERE status = 'Active'
            ORDER BY created_at DESC
            LIMIT 10
        `);

        // Format price and image if needed
        const formatted = products.map(p => ({
            ...p,
            price: Number(p.price),
            // Ensure image URL is absolute or valid
            image: p.image || '/assets/placeholder-jacket.png'
        }));

        return NextResponse.json(formatted, {
            headers: {
                headers: {
                    'Cache-Control': 'no-store, max-age=0'
                }
            }
        });
    } catch (error) {
        console.error("Failed to fetch trending products:", error);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}
