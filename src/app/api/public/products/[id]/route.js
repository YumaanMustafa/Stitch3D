import { NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * @file route.js
 * @description Public Product Details API.
 * Fetches a single product by ID for public display.
 */

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const [rows] = await db.query(`
            SELECT * FROM vendor_products WHERE id = ?
        `, [id]);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error("Failed to fetch product:", error);
        return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
    }
}
