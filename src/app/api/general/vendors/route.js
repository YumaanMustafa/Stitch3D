import { NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * @file route.js
 * @description Public Vendors List API.
 * Fetches all active vendors to allow customers to choose who fulfills their custom designs.
 */

export async function GET() {
    try {
        const [vendors] = await db.query("SELECT vendor_id, name, company_name FROM vendors");
        return NextResponse.json(vendors);
    } catch (error) {
        console.error("Failed to fetch vendors:", error);
        return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
    }
}
