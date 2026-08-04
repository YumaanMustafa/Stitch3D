// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';

/**
 * File: route.js
 * Location: src/app/api/public/products/trending/route.js
 * Description: Trending Products API.
 * This route fetches 10 products to display as "Trending Now" on the main home page. 
 * Because it is on the public home page, no login token is required to use this route.
 */

// ==========================================
// GET HANDLER: Fetch trending products
// ==========================================
export async function GET(request) {
    try {
        // Step 1: Fetch active products from the database
        // For right now, "Trending" just means "The 10 newest products".
        // We use ORDER BY created_at DESC to sort newest-first, and LIMIT 10 to stop at 10 items.
        // In a real, massive app, this might be based on sales numbers or click counts instead.
        const [products] = await db.query(`
            SELECT id, name, price, stock, category, image, status, created_at, average_rating, total_reviews
            FROM vendor_products
            WHERE status = 'Active'
            ORDER BY created_at DESC
            LIMIT 10
        `);

        // Step 2: Format the data perfectly for the frontend UI
        const formatted = products.map(p => ({
            ...p,
            price: Number(p.price),
            // Ensure the image URL is valid. If a vendor forgot to upload a picture, 
            // we provide a placeholder image of a jacket so the website doesn't look broken.
            image: p.image || '/assets/placeholder-jacket.png'
        }));

        // Step 3: Send the list back to the browser
        // We use Cache-Control headers to tell the browser NOT to cache this result, 
        // so the home page always shows the absolute newest items.
        return NextResponse.json(formatted, {
            headers: {
                'Cache-Control': 'no-store, max-age=0'
            }
        });
        
    } catch (error) {
        // Log crashes safely
        console.error("Failed to fetch trending products:", error);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}
