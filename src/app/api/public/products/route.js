import { NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * @file route.js
 * @description Public Product List API.
 * Fetches active products with optional filtering by category and search term.
 * Used for the main marketplace/shop page.
 */

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        let query = `
            SELECT id, name, price, stock, category, image, status, created_at, vendor_id, average_rating, total_reviews
            FROM vendor_products
            WHERE status = 'Active'
        `;
        const params = [];

        if (category && category !== 'All') {
            query += ` AND category = ?`;
            params.push(category);
        }

        if (search) {
            query += ` AND (name LIKE ? OR description LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY created_at DESC`;

        const [products] = await db.query(query, params);

        return NextResponse.json(products);
    } catch (error) {
        console.error("Failed to fetch products:", error);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}
